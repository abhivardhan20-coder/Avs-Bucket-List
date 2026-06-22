import { addToBlacklist } from "../lib/blacklist";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

import jwt from "jsonwebtoken";

import { AppError } from "../lib/AppError";
import { createHash } from "crypto";

const BEARER_PREFIX = "Bearer ";

class AuthError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthService {
  /**
   * Processes the logout for a user
   * @param authHeader The authorization header containing the token
   * @param reqSub The authenticated user's ID
   */
  static async logout(authHeader?: string, reqSub?: string): Promise<{ success: boolean; message: string }> {
    if (authHeader && authHeader.startsWith(BEARER_PREFIX) && reqSub) {
      const token = authHeader.substring(BEARER_PREFIX.length);
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      if (!decoded || decoded.sub !== reqSub) {
        throw new AuthError("Token sub does not match authenticated user");
      }
      
      if (decoded.exp && (decoded.exp * 1000) < Date.now()) {
        throw new AuthError("Token has already expired");
      }
      
      if (decoded.iat) {
        const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days
        if ((Date.now() / 1000) - decoded.iat > maxAgeSeconds) {
           throw new AuthError("Token is too old to be explicitly blacklisted");
        }
      }
      
      // The authMiddleware has already verified that this token is valid and belongs
      // to the authenticated user. We now securely blacklist it.
      await addToBlacklist(token);
    }
    return { success: true, message: "Logged out successfully" };
  }

  static async register(email: string, password: string): Promise<{ user: any; session: any }> {
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email));
    
    // We intentionally don't throw "User already exists" to prevent email enumeration.
    // If the user already exists, we will log it and return a mock success response.
    // In a real app, you might want to send an email saying "someone tried to register with your email"
    if (existingUser.length > 0) {
      logger.info({ email }, "Registration attempt for existing email");
      throw new AuthError("Unable to complete registration. If this is your email, try logging in or resetting your password.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(usersTable).values({
      email,
      passwordHash,
    }).returning();

    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0];
    if (!secret) throw new AuthError("SUPABASE_JWT_SECRET is not configured");

    const token = jwt.sign({
      sub: newUser.id,
      email: newUser.email,
      role: "authenticated",
      aud: "authenticated"
    }, secret, { expiresIn: '1h' });

    return {
      user: { id: newUser.id, email: newUser.email },
      session: { access_token: token, expires_in: 3600 }
    };
  }

  static async login(email: string, password: string): Promise<{ user: any; session: any }> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      throw new AuthError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthError("Invalid email or password");
    }

    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0];
    if (!secret) throw new AuthError("SUPABASE_JWT_SECRET is not configured");

    const token = jwt.sign({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated"
    }, secret, { expiresIn: '1h' });

    return {
      user: { id: user.id, email: user.email },
      session: { access_token: token, expires_in: 3600 }
    };
  }

  static async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0];
    if (!secret) throw new AuthError("SUPABASE_JWT_SECRET is not configured");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { success: true, message: "Password reset instructions sent to email" };
    }

    const resetToken = jwt.sign(
      { email, type: 'password_reset' },
      secret,
      { expiresIn: '15m' }
    );
    
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // If no SMTP_USER, we are probably in dev and using a mock or it will fail.
      if (!process.env.SMTP_USER) {
        const tokenFingerprint = (t: string) => createHash('sha256').update(t).digest('hex').slice(0, 8);
        logger.info({ email, tokenFingerprint: tokenFingerprint(resetToken) }, "MOCK EMAIL: Password reset requested (dev only)");
      } else {
        await transporter.sendMail({
          from: '"Bucket List Auth" <noreply@bucketlist.com>',
          to: email,
          subject: "Password Reset Request",
          text: `Click the link to reset your password: ${process.env.FRONTEND_URL}/reset?token=${resetToken}\nIt will expire in 15 minutes.`,
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to send password reset email");
    }

    return { 
      success: true, 
      message: "Password reset instructions sent to email",
    };
  }

  static async confirmReset(token: string, newPassword: string): Promise<{ success: boolean }> {
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0];
    if (!secret) throw new AuthError("SUPABASE_JWT_SECRET is not configured");

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (payload.type !== 'password_reset') throw new AuthError('Invalid reset token');
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, payload.email));
      
      // Prevent token reuse by blacklisting it immediately
      await addToBlacklist(token);
      
      return { success: true };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('Reset token has expired');
      }
      throw new AuthError('Invalid reset token');
    }
  }
}

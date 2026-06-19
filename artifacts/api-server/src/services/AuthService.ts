import { addToBlacklist } from "../lib/blacklist";

import jwt from "jsonwebtoken";

const BEARER_PREFIX = "Bearer ";

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
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
    // Mock registration using custom JWTs since we don't have Supabase SDK linked
    // We sign the token with our secret so that authMiddleware accepts it!
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0] || "test_secret";
    const sub = "usr_" + Math.random().toString(36).substring(7);
    const token = jwt.sign({
      sub,
      email,
      role: "authenticated",
      aud: "authenticated"
    }, secret, { expiresIn: '1h' });

    return {
      user: { id: sub, email },
      session: { access_token: token, expires_in: 3600 }
    };
  }

  static async login(email: string, password: string): Promise<{ user: any; session: any }> {
    // Mock login
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0] || "test_secret";
    const sub = "usr_mock_" + Buffer.from(email).toString('hex').slice(0, 8);
    const token = jwt.sign({
      sub,
      email,
      role: "authenticated",
      aud: "authenticated"
    }, secret, { expiresIn: '1h' });

    return {
      user: { id: sub, email },
      session: { access_token: token, expires_in: 3600 }
    };
  }

  static async resetPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    // Mock password reset flow
    const secret = process.env.SUPABASE_JWT_SECRET?.split(',')[0] || "test_secret_that_is_at_least_32_characters_long";
    const resetToken = jwt.sign(
      { email, type: 'password_reset' },
      secret,
      { expiresIn: '15m' }
    );
    
    // In a real app, send this token via email.
    return { 
      success: true, 
      message: "Password reset instructions sent",
      resetToken // Returned here strictly for testing/mock purposes
    };
  }
}

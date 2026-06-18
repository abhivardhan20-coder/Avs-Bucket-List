import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../lib/env";
import { isBlacklisted } from "../lib/blacklist";
import { SecretService } from "../services/SecretService";

export interface UserMetadata {
  avatar_url?: string;
  full_name?: string;
  name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

export interface SupabaseJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: UserMetadata;
}

export interface AuthenticatedRequest extends Request {
  user?: SupabaseJwtPayload;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const isRevoked = await isBlacklisted(token);
    if (isRevoked) {
      res.status(401).json({ error: "Token has been revoked" });
      return;
    }

    let decoded: SupabaseJwtPayload | null = null;
    let lastError: Error | null = null;

    // Check against all secrets (supports secret rotation)
    const secrets = SecretService.getSecrets();
    for (const secret of secrets) {
      try {
        decoded = jwt.verify(token, secret) as SupabaseJwtPayload;
        break; // Successfully verified
      } catch (err) {
        lastError = err as Error;
      }
    }

    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token", details: lastError?.message });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error during authentication" });
  }
}

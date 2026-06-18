import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../lib/env";
import { isBlacklisted } from "../lib/blacklist";

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

  const isRevoked = await isBlacklisted(token);
  if (isRevoked) {
    res.status(401).json({ error: "Token has been revoked" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

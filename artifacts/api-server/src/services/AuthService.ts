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
      
      // The authMiddleware has already verified that this token is valid and belongs
      // to the authenticated user. We now securely blacklist it.
      await addToBlacklist(token);
    }
    return { success: true, message: "Logged out successfully" };
  }
}

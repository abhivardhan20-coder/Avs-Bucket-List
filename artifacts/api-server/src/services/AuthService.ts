import { addToBlacklist } from "../lib/blacklist";

import jwt from "jsonwebtoken";

export class AuthService {
  /**
   * Processes the logout for a user
   * @param authHeader The authorization header containing the token
   * @param reqSub The authenticated user's ID
   */
  static async logout(authHeader?: string, reqSub?: string): Promise<{ success: boolean; message: string }> {
    if (authHeader && authHeader.startsWith("Bearer ") && reqSub) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      if (!decoded || decoded.sub !== reqSub) {
        throw new Error("Token sub does not match authenticated user");
      }
      
      // The authMiddleware has already verified that this token is valid and belongs
      // to the authenticated user. We now securely blacklist it.
      await addToBlacklist(token);
    }
    return { success: true, message: "Logged out successfully" };
  }
}

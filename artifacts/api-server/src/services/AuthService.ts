import { addToBlacklist } from "../lib/blacklist";

export class AuthService {
  /**
   * Processes the logout for a user
   * @param authHeader The authorization header containing the token
   */
  static async logout(authHeader?: string): Promise<{ success: boolean; message: string }> {
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      // The authMiddleware has already verified that this token is valid and belongs
      // to the authenticated user. We now securely blacklist it.
      await addToBlacklist(token);
    }
    return { success: true, message: "Logged out successfully" };
  }
}

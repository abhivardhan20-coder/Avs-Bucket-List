import { db } from "@workspace/db";
import { tokenBlacklistTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

export async function addToBlacklist(token: string) {
  try {
    await db.insert(tokenBlacklistTable).values({ token });
  } catch (error) {
    // Ignore if already exists
  }
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const result = await db
    .select({ token: tokenBlacklistTable.token })
    .from(tokenBlacklistTable)
    .where(eq(tokenBlacklistTable.token, token))
    .limit(1);
  return result.length > 0;
}

export async function cleanupBlacklist() {
  try {
    // Tokens older than 24 hours are deleted
    const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(tokenBlacklistTable).where(lt(tokenBlacklistTable.revokedAt, expiryThreshold));
  } catch (error) {
    // Ignore error
  }
}

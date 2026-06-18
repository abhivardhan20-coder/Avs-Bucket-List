import { db } from "@workspace/db";
import { tokenBlacklistTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { logger } from "./logger";

export async function addToBlacklist(token: string) {
  try {
    await db.insert(tokenBlacklistTable).values({ token });
  } catch (error) {
    logger.error({ err: error, token }, "Failed to add token to blacklist");
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
    logger.error({ err: error }, "Failed to cleanup blacklist");
  }
}

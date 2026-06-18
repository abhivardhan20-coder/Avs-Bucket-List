import { db } from "@workspace/db";
import { tokenBlacklistTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { logger } from "./logger";
import { env } from "./env";
import { CacheService } from "../services/CacheService";

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export async function addToBlacklist(token: string): Promise<void> {
  try {
    await db.insert(tokenBlacklistTable).values({ token });
    await CacheService.set(`blacklist_${token}`, true, 86400); // Cache the revocation for 24h
  } catch (error) {
    logger.error({ err: error, token }, "Failed to add token to blacklist");
    throw new DatabaseError("Failed to blacklist token due to database error");
  }
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const cacheKey = `blacklist_${token}`;
  try {
    const cached = await CacheService.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  } catch (err) {
    logger.warn({ err }, "Failed to read from cache");
  }

  try {
    const result = await db
      .select({ token: tokenBlacklistTable.token })
      .from(tokenBlacklistTable)
      .where(eq(tokenBlacklistTable.token, token))
      .limit(1);
    
    const isRevoked = result.length > 0;
    
    // Cache the result (5 mins for misses, 24h for hits)
    try {
      await CacheService.set(cacheKey, isRevoked, isRevoked ? 86400 : 300);
    } catch (err) {
      logger.warn({ err }, "Failed to write to cache");
    }
    
    return isRevoked;
  } catch (error) {
    logger.error({ err: error, token }, "Failed to check if token is blacklisted");
    throw new DatabaseError("Failed to verify token revocation status from database");
  }
}

export async function cleanupBlacklist(): Promise<void> {
  try {
    const expiryThreshold = new Date(Date.now() - env.BLACKLIST_EXPIRY_MS);
    await db.delete(tokenBlacklistTable).where(lt(tokenBlacklistTable.revokedAt, expiryThreshold));
  } catch (error) {
    logger.error({ err: error }, "Failed to cleanup blacklist");
    throw error;
  }
}

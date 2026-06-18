import { db } from "@workspace/db";
import { tokenBlacklistTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

import { CacheService } from "./CacheService";
import { env } from "./env";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
}

import { db } from "@/db";
import { preferencesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export class PreferencesService {
  /**
   * Updates user preferences
   */
  static async updatePreferences(userId: string, prefs: UserPreferences): Promise<UserPreferences> {
    const cacheKey = `prefs_${userId}`;
    
    // Update database
    await db.insert(preferencesTable).values({
      userId,
      theme: prefs.theme,
      notificationsEnabled: prefs.notificationsEnabled,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: preferencesTable.userId,
      set: {
        theme: prefs.theme,
        notificationsEnabled: prefs.notificationsEnabled,
        updatedAt: new Date()
      }
    });

    // Write-through to cache
    await CacheService.set(cacheKey, prefs, env.PREFERENCES_CACHE_TTL_SECONDS);
    
    return prefs;
  }

  /**
   * Fetches user preferences
   */
  static async getPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `prefs_${userId}`;
    const cachedPrefs = await CacheService.get<UserPreferences>(cacheKey);
    
    if (cachedPrefs) {
      return cachedPrefs;
    }

    // Fetch from DB
    const [dbPrefs] = await db.select().from(preferencesTable).where(eq(preferencesTable.userId, userId));
    
    const prefs: UserPreferences = dbPrefs ? {
      theme: dbPrefs.theme as "light" | "dark" | "system",
      notificationsEnabled: dbPrefs.notificationsEnabled
    } : {
      theme: "system",
      notificationsEnabled: true
    };
    
    // Set in cache for future reads
    await CacheService.set(cacheKey, prefs, env.PREFERENCES_CACHE_TTL_SECONDS);
    
    return prefs;
  }
}

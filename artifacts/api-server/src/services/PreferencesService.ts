import { CacheService } from "./CacheService";
import { env } from "../lib/env";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
}

export class PreferencesService {
  /**
   * Updates user preferences
   */
  static async updatePreferences(userId: string, prefs: UserPreferences): Promise<UserPreferences> {
    // Here you would normally update the database
    // For now, we'll just update the cache to simulate a database operation
    const cacheKey = `prefs_${userId}`;
    await CacheService.set(cacheKey, prefs, env.PREFERENCES_CACHE_TTL_SECONDS); // cache for 24 hours
    
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

    // Normally fetch from DB here if not in cache
    // Mocking a fetch from DB
    const defaultPrefs: UserPreferences = {
      theme: "system",
      notificationsEnabled: true
    };
    
    // Set in cache for future reads
    await CacheService.set(cacheKey, defaultPrefs, env.PREFERENCES_CACHE_TTL_SECONDS);
    
    return defaultPrefs;
  }
}

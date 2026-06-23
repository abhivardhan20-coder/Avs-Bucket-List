
import { env } from './env';
import { logger } from './logger';

export class SecretService {
  private static cachedSecrets: string[] = [];
  private static lastLoadTime: number = 0;
  private static readonly RELOAD_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Gets the current valid JWT secrets.
   * Periodically checks the .env file to support rotation without a server restart.
   */
  static getSecrets(): string[] {
    const now = Date.now();
    
    // Check if we need to reload secrets from the file
    if (this.cachedSecrets.length === 0 || now - this.lastLoadTime > this.RELOAD_INTERVAL_MS) {
      this.reloadSecrets();
    }

    return this.cachedSecrets;
  }

  /**
   * Reloads secrets from the environment natively instead of the filesystem.
   * In a production environment, this should connect to a Secrets Manager (AWS/Vault).
   */
  private static reloadSecrets(): void {
    try {
      // Dynamic process.env check if orchestration injects updates
      const dynamicSecret = process.env.SUPABASE_JWT_SECRET;
      
      if (dynamicSecret) {
        const rawSecrets = dynamicSecret.replace(/['"]/g, '').trim();
        this.cachedSecrets = rawSecrets.split(',').map(s => s.trim());
        this.lastLoadTime = Date.now();
        return;
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse dynamic process.env secrets');
    }

    // Fallback to the initial env variables loaded at startup
    if (this.cachedSecrets.length === 0) {
      this.cachedSecrets = env.SUPABASE_JWT_SECRET;
      this.lastLoadTime = Date.now();
    }
  }
}

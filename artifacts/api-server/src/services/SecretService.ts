import fs from 'fs';
import path from 'path';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

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
   * Reloads secrets from the .env file if available, or falls back to the initial env.
   */
  private static reloadSecrets(): void {
    try {
      const envPath = path.resolve(process.cwd(), '../../.env'); // Assuming monorepo root .env
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^SUPABASE_JWT_SECRET=(.*)$/m);
        
        if (match && match[1]) {
          const rawSecrets = match[1].replace(/['"]/g, '').trim();
          this.cachedSecrets = rawSecrets.split(',').map(s => s.trim());
          this.lastLoadTime = Date.now();
          logger.debug('Reloaded SUPABASE_JWT_SECRET from .env file for secret rotation');
          return;
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to reload secrets from .env file, falling back to initial env');
    }

    // Fallback to the initial env variables loaded at startup
    if (this.cachedSecrets.length === 0) {
      this.cachedSecrets = env.SUPABASE_JWT_SECRET;
      this.lastLoadTime = Date.now();
    }
  }
}

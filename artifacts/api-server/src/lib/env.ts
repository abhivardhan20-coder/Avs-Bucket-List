import { z } from "zod";
import "dotenv/config";
import { logger } from "./logger";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().default("http://localhost:5173").describe("Comma-separated list of allowed frontend origins"),
  ALLOW_NO_ORIGIN: z.string().default("true").transform((v) => v === "true"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number), // 15 * 60 * 1000
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),
  SUPABASE_JWT_SECRET: z.string()
    .refine((val) => {
      const secrets = val.split(',').map(s => s.trim());
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/;
      return secrets.every(s => s.length >= 64 && regex.test(s));
    }, "Each secret must be at least 64 chars long and contain uppercase, lowercase, number, and special character")
    .transform(s => s.split(',').map(v => v.trim())),
  DATABASE_URL: z.string().optional(),
  CLEANUP_CRON_SCHEDULE: z.string().default("0 * * * *"),
  BLACKLIST_EXPIRY_MS: z.string().default("86400000").transform(Number), // 24 hours in ms
  PREFERENCES_CACHE_TTL_SECONDS: z.string().default("86400").transform(Number), // 24 hours in s
  API_VERSION: z.string().default("v1"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  logger.fatal({ err: error }, "Failed to validate environment variables. Exiting...");
  process.exit(1);
}

export const env = parsedEnv;

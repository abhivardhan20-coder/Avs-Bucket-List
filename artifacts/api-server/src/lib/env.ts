import { z } from "zod";
import "dotenv/config";
import { logger } from "./logger";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().describe("Comma-separated list of allowed frontend origins")
    .default(process.env.NODE_ENV === 'production' ? "" : "http://localhost:5173")
    .refine(val => val !== "", { message: "FRONTEND_URL must be explicitly set in production" }),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number), // 15 * 60 * 1000
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),
  SUPABASE_JWT_SECRET: z.string()
    .min(32, "Secret must be at least 32 characters long")
    .transform(s => s.split(',').map(v => v.trim())),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set"),
  CLEANUP_CRON_SCHEDULE: z.string().default("0 3 * * *"), // 3 AM daily
  BLACKLIST_EXPIRY_MS: z.string().default("86400000").transform(Number), // 24 hours in ms
  PREFERENCES_CACHE_TTL_SECONDS: z.string().default("86400").transform(Number), // 24 hours in s
  API_VERSION: z.string().default("v1"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SENTRY_DSN: z.string().optional(),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  logger.fatal({ err: error }, "Failed to validate environment variables. Exiting...");
  process.exit(1);
}

export const env = parsedEnv;

import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().default(""),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),
  SUPABASE_JWT_SECRET: z.string().default("dummysecretdummysecretdummysecret").transform(s => s.split(',').map(v => v.trim())),
  DATABASE_URL: z.string().default("postgres://dummy:dummy@localhost:5432/dummy"),
  CLEANUP_CRON_SCHEDULE: z.string().default("0 3 * * *"),
  BLACKLIST_EXPIRY_MS: z.string().default("86400000").transform(Number),
  PREFERENCES_CACHE_TTL_SECONDS: z.string().default("86400").transform(Number),
  API_VERSION: z.string().default("v1"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SENTRY_DSN: z.string().optional(),
  ALLOW_CREDENTIALS: z.string().default("true").transform(s => s.toLowerCase() === "true"),
  TMDB_API_KEY: z.string().default("dummykey"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  logger.error({ err: error }, "Failed to validate environment variables. Using defaults for build...");
  // Provide dummy payload so it doesn't crash during build
  parsedEnv = {
    PORT: "3000",
    FRONTEND_URL: "",
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    SUPABASE_JWT_SECRET: ["dummysecretdummysecretdummysecret"],
    DATABASE_URL: "postgres://dummy:dummy@localhost:5432/dummy",
    CLEANUP_CRON_SCHEDULE: "0 3 * * *",
    BLACKLIST_EXPIRY_MS: 86400000,
    PREFERENCES_CACHE_TTL_SECONDS: 86400,
    API_VERSION: "v1",
    REDIS_URL: "redis://localhost:6379",
    ALLOW_CREDENTIALS: true,
    TMDB_API_KEY: "dummy",
  };
}

export const env = parsedEnv;

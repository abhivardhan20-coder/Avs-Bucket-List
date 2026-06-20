import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string(),
  FRONTEND_URL: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  TMDB_API_KEY: z.string().min(1).optional(),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

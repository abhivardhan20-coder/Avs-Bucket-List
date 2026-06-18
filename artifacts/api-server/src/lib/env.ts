import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().default("http://localhost:5173").describe("Comma-separated list of allowed frontend origins"),
  ALLOW_NO_ORIGIN: z.string().default("true").transform((v) => v === "true"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number), // 15 * 60 * 1000
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),
  SUPABASE_JWT_SECRET: z.string()
    .min(64, "SUPABASE_JWT_SECRET must be at least 64 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/, "Must contain at least one uppercase, one lowercase, one number, and one special character"),
  DATABASE_URL: z.string().optional(),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  logger.fatal({ err: error }, "Failed to validate environment variables. Exiting...");
  process.exit(1);
}

export const env = parsedEnv;

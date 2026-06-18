import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().default("http://localhost:5173").describe("Comma-separated list of allowed frontend origins"),
  SUPABASE_JWT_SECRET: z.string()
    .min(64, "SUPABASE_JWT_SECRET must be at least 64 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/, "Must contain at least one uppercase, one lowercase, one number, and one special character"),
  DATABASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

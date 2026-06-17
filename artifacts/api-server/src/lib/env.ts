import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  SUPABASE_JWT_SECRET: z.string().min(1, "SUPABASE_JWT_SECRET is required"),
  DATABASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

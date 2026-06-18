import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  FRONTEND_URL: z.string().default("http://localhost:5173").describe("Comma-separated list of allowed frontend origins"),
  SUPABASE_JWT_SECRET: z.string().min(64, "SUPABASE_JWT_SECRET must be at least 64 characters long").regex(/[a-zA-Z0-9_-]+/, "Must contain valid characters"),
  DATABASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

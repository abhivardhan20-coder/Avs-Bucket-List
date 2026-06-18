import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      SUPABASE_JWT_SECRET: "A1b@5678901234567890123456789012345678901234567890123456789012345",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/postgres",
      FRONTEND_URL: "http://localhost:5173"
    }
  }
});

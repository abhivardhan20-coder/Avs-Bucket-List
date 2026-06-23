import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./supabase/migrations" });
    console.log("Migrations applied successfully.");
  } catch (err) {
    console.error("Error running migrations:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

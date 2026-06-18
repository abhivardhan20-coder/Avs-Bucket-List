import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tokenBlacklistTable = pgTable("token_blacklist", {
  token: text("token").primaryKey(),
  revokedAt: timestamp("revoked_at").defaultNow().notNull(),
});

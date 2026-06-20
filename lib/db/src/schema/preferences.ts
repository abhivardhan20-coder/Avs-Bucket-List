import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const preferencesTable = pgTable("preferences", {
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).primaryKey(),
  theme: text("theme").default("system").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

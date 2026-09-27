// Drizzle client instance
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// --- BETTER AUTH TABLES ---
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
});

// --- QLO-AFRICA BUSINESS TABLES ---
export const fleetProposals = pgTable("fleet_proposals", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  kraPin: text("kra_pin").notNull(),
  fleetSize: integer("fleet_size").notNull(),
  status: text("status").notNull().default("Pending"), // Pending, Approved, Flagged
  riskScore: integer("risk_score"),
  aiRationale: text("ai_rationale"),
  humanOverride: boolean("human_override").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
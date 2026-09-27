import { integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth";
export const fleetProposals = pgTable("fleet_proposals", {
  id: text("id").primaryKey(), companyName: text("company_name").notNull(), kraPin: text("kra_pin").notNull(),
  fleetSize: integer("fleet_size").notNull(), status: text("status").notNull().default("PENDING"), riskScore: integer("risk_score"),
  aiRecommendation: text("ai_recommendation"), aiRationale: text("ai_rationale"), humanDecision: text("human_decision"),
  humanDecisionReason: text("human_decision_reason"), humanOverride: boolean("human_override").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

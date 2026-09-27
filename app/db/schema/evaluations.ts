import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { fleetProposals } from "./proposals";
export const agentExecutions = pgTable("agent_executions", {
  id: text("id").primaryKey(), agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  proposalId: text("proposal_id").notNull().references(() => fleetProposals.id, { onDelete: "cascade" }), status: text("status").notNull().default("PENDING"),
  input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}), output: jsonb("output").$type<Record<string, unknown>>(), error: text("error"),
  startedAt: timestamp("started_at"), completedAt: timestamp("completed_at"), createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const underwritingDecisions = pgTable("underwriting_decisions", {
  id: text("id").primaryKey(), proposalId: text("proposal_id").notNull().references(() => fleetProposals.id, { onDelete: "cascade" }),
  underwriterId: text("underwriter_id").notNull(), decision: text("decision").notNull(), reason: text("reason").notNull(),
  aiRecommendationAtDecision: text("ai_recommendation_at_decision"), createdAt: timestamp("created_at").notNull().defaultNow(),
});

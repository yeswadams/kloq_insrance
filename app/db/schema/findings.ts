import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { agentExecutions } from "./evaluations";
import { fleetProposals } from "./proposals";
export const findings = pgTable("findings", {
  id: text("id").primaryKey(), proposalId: text("proposal_id").notNull().references(() => fleetProposals.id, { onDelete: "cascade" }),
  agentExecutionId: text("agent_execution_id").references(() => agentExecutions.id, { onDelete: "set null" }),
  category: text("category").notNull(), severity: text("severity").notNull(), title: text("title").notNull(), description: text("description").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp("created_at").notNull().defaultNow(),
});

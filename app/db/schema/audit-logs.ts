import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { fleetProposals } from "./proposals";
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(), actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  proposalId: text("proposal_id").references(() => fleetProposals.id, { onDelete: "set null" }), action: text("action").notNull(),
  entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { user } from "./auth";
import { fleetProposals } from "./proposals";

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  proposalId: text("proposal_id").references(() => fleetProposals.id, { onDelete: "set null" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

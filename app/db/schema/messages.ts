import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { agentExecutions } from "./evaluations";

export const conversationMessages = pgTable("conversation_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  agentExecutionId: text("agent_execution_id").references(() => agentExecutions.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  events: jsonb("events").$type<Record<string, unknown>[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/app/db";
import { conversationMessages, conversations } from "@/app/db/schema";

export async function createConversation(agentId: string, userId: string, firstMessage: string, proposalId?: string) {
  const id = randomUUID();
  const [conversation] = await db.insert(conversations).values({ id, agentId, proposalId: proposalId ?? null, createdBy: userId, title: firstMessage.slice(0, 120) || "New conversation" }).returning();
  return conversation;
}

export async function getConversation(conversationId: string, userId: string) {
  const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.createdBy, userId))).limit(1);
  return conversation ?? null;
}

export async function addConversationMessage(input: { conversationId: string; role: "user" | "assistant"; content: string; events?: Record<string, unknown>[]; agentExecutionId?: string | null }) {
  const [message] = await db.insert(conversationMessages).values({ id: randomUUID(), conversationId: input.conversationId, role: input.role, content: input.content, events: input.events ?? [], agentExecutionId: input.agentExecutionId ?? null }).returning();
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
  return message;
}

export async function listConversationMessages(conversationId: string) {
  return db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(asc(conversationMessages.createdAt));
}

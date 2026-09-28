import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth/session";
import { addConversationMessage, createConversation, getConversation } from "@/app/server/conversations/service";
import { executeAgentTask } from "@/app/ai/agents/executor";
import { getAgent } from "@/app/server/agents/service";
import { getProposal } from "@/app/server/proposals/service";

// E2B sandbox startup and real browser navigation can exceed a short serverless default timeout.
export const maxDuration = 90;

const messageSchema = z.object({
  agentId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  proposalId: z.string().uuid().optional(),
  content: z.string().trim().min(3).max(4000),
}).strict();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message", issues: parsed.error.issues }, { status: 400 });
  const { agentId, conversationId, proposalId, content } = parsed.data;
  const agent = await getAgent(agentId);
  if (!agent) return NextResponse.json({ error: "Agent was not found" }, { status: 404 });
  if (!agent.enabled) return NextResponse.json({ error: "Agent is disabled" }, { status: 409 });
  const proposal = proposalId ? await getProposal(proposalId) : null;
  if (proposalId && !proposal) return NextResponse.json({ error: "Proposal was not found" }, { status: 404 });
  const conversation = conversationId
    ? await getConversation(conversationId, user.id)
    : await createConversation(agentId, user.id, content, proposalId);
  if (!conversation || conversation.agentId !== agentId || (conversation.proposalId ?? null) !== (proposalId ?? null)) return NextResponse.json({ error: "Conversation was not found" }, { status: 404 });
  await addConversationMessage({ conversationId: conversation.id, role: "user", content });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      void (async () => {
        try {
          const execution = await executeAgentTask(agentId, conversation.id, content, "auto", proposal, (event) => send("progress", event));
          const result = execution.result;
          const responseText = result ? [
            `Finding\n${result.output.finding}`,
            `Evidence\n${result.evidence.length ? result.evidence.map((item) => item.detail).join("\n") : "No external evidence was gathered for this task."}`,
            `Reasoning\n${result.output.reasoning}`,
            `Next action\n${result.output.nextAction}`,
          ].join("\n\n") : (execution.error ?? "The agent could not complete the task.");
          const events = execution.events.map((event) => ({ ...event, agentExecutionId: execution.executionId })) as Record<string, unknown>[];
          const assistantMessage = await addConversationMessage({ conversationId: conversation.id, role: "assistant", content: responseText, events, agentExecutionId: execution.executionId });
          send("complete", { conversationId: conversation.id, message: assistantMessage, execution: { id: execution.executionId, status: execution.status } });
        } catch (cause) {
          send("error", { error: cause instanceof Error ? cause.message : "The agent could not complete the task." });
        } finally { controller.close(); }
      })();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive" } });
}

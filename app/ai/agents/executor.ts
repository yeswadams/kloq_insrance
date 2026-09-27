import { randomUUID } from "node:crypto";
import { Output, generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/app/db";
import { agents, agentExecutions, findings, fleetProposals } from "@/app/db/schema";
import { agentResultGenerationSchema, agentResultSchema } from "@/app/ai/schemas/agent-result";
import { buildAgentPrompt } from "@/app/ai/prompts/agent-execution";
import { getGroqModel } from "@/app/ai/providers/groq";
import type { AgentExecutionMode, AgentExecutionOutcome } from "./types";
import { loadAgent } from "./registry";
import { runAgentTask, type RuntimeEvent } from "./runtime";

async function executeWithGroq(agent: ReturnType<typeof loadAgent>, context: Parameters<typeof agent.execute>[0]) {
  const prompt = buildAgentPrompt(agent, context);
  const { output } = await generateText({
    model: getGroqModel(),
    output: Output.object({ schema: agentResultGenerationSchema }),
    system: prompt.system,
    prompt: prompt.prompt,
    maxRetries: 1,
  });
  return agentResultSchema.parse(output);
}

function resolveMode(mode: AgentExecutionMode): Exclude<AgentExecutionMode, "auto"> {
  if (mode === "auto") return process.env.GROQ_API_KEY ? "groq" : "mock";
  return mode;
}

export async function executeAgent(
  agentId: string,
  proposalId: string,
  requestedMode: AgentExecutionMode = "auto",
): Promise<AgentExecutionOutcome> {
  const [agentRecord] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  const [proposal] = await db.select().from(fleetProposals).where(eq(fleetProposals.id, proposalId)).limit(1);
  if (!agentRecord || !proposal) throw new Error("Agent or proposal was not found");
  if (!agentRecord.enabled) throw new Error("Agent is disabled");

  const id = randomUUID();
  const executionMode = resolveMode(requestedMode);
  await db.insert(agentExecutions).values({
    id,
    agentId,
    proposalId,
    status: "RUNNING",
    startedAt: new Date(),
    input: { proposalId, agentType: agentRecord.type, executionMode },
  });

  try {
    const agent = loadAgent(agentRecord);
    const context = { proposal, configuration: agentRecord.configuration, instructions: agentRecord.instructions };
    const unvalidatedResult = executionMode === "mock"
      ? await agent.execute(context)
      : await executeWithGroq(agent, context);
    const result = agentResultSchema.parse(unvalidatedResult);
    const status = result.success ? "COMPLETED" : "FAILED";
    const error = result.success ? null : "Agent returned an unsuccessful result";

    // Only validated application data reaches PostgreSQL. Execution and findings commit together.
    await db.transaction(async (tx) => {
      await tx.update(agentExecutions).set({ status, output: result, error, completedAt: new Date() }).where(eq(agentExecutions.id, id));
      if (result.findings.length) {
        await tx.insert(findings).values(result.findings.map((finding) => ({
          id: randomUUID(),
          proposalId,
          agentExecutionId: id,
          category: finding.category,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          evidence: { items: finding.evidence },
        })));
      }
    });
    return { executionId: id, status, result, error };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Agent execution failed";
    await db.update(agentExecutions).set({ status: "FAILED", error: error.slice(0, 2000), completedAt: new Date() }).where(eq(agentExecutions.id, id));
    return { executionId: id, status: "FAILED", result: null, error };
  }
}

/** Conversation execution shares the same validated execution/findings tables as proposal runs. */
export async function executeAgentTask(agentId: string, conversationId: string, task: string, mode: AgentExecutionMode = "auto", proposal?: { id: string; companyName: string; kraPin: string; fleetSize: number } | null):
Promise<AgentExecutionOutcome & { events: RuntimeEvent[] }> {
  const [agentRecord] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agentRecord) throw new Error("Agent was not found");
  if (!agentRecord.enabled) throw new Error("Agent is disabled");
  const id = randomUUID();
  await db.insert(agentExecutions).values({ id, agentId, conversationId, proposalId: proposal?.id ?? null, status: "RUNNING", startedAt: new Date(), input: { task, conversationId, mode, proposalId: proposal?.id ?? null } });
  try {
    const execution = await runAgentTask({ agent: agentRecord, task, proposal, mode });
    const result = agentResultSchema.parse(execution.result);
    const status = result.success ? "COMPLETED" : "FAILED";
    await db.transaction(async (tx) => {
      await tx.update(agentExecutions).set({ status, output: result, input: { task, conversationId, mode, proposalId: proposal?.id ?? null, runtimeEvents: execution.events }, error: result.success ? null : "Agent returned an unsuccessful result", completedAt: new Date() }).where(eq(agentExecutions.id, id));
      if (result.findings.length) await tx.insert(findings).values(result.findings.map((finding) => ({
        id: randomUUID(), conversationId, proposalId: proposal?.id ?? null, agentExecutionId: id,
        category: finding.category, severity: finding.severity, title: finding.title,
        description: finding.description, evidence: { items: finding.evidence },
      })));
    });
    return { executionId: id, status, result, error: result.success ? null : "Agent returned an unsuccessful result", events: execution.events };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Agent execution failed";
    await db.update(agentExecutions).set({ status: "FAILED", error: error.slice(0, 2000), completedAt: new Date() }).where(eq(agentExecutions.id, id));
    return { executionId: id, status: "FAILED", result: null, error, events: [{ type: "execution_failed", message: "The task could not be completed. You can retry or choose another agent." }] };
  }
}

import { executeAgent } from "@/app/ai/agents/executor";
import type { AgentExecutionMode } from "@/app/ai/agents/types";
export async function startAgentExecution(agentId: string, proposalId: string, mode: AgentExecutionMode = "auto") { return executeAgent(agentId, proposalId, mode); }

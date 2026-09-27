import type { AgentResult } from "@/app/ai/schemas/agent-result";

export type AgentContext = {
  proposal: { id: string; companyName: string; kraPin: string; fleetSize: number };
  configuration: Record<string, unknown>;
  instructions: string;
};

export type Agent = {
  id: string;
  name: string;
  type: string;
  description: string;
  instructions: string;
  configuration: Record<string, unknown>;
  execute(context: AgentContext): Promise<AgentResult>;
};

export type AgentExecutionMode = "auto" | "mock" | "groq";
export type AgentExecutionOutcome = {
  executionId: string;
  status: "COMPLETED" | "FAILED";
  result: AgentResult | null;
  error: string | null;
};

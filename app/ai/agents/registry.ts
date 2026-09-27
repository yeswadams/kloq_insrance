import type { Agent } from "./types";

const implementations = new Map<string, Agent["execute"]>();

export function registerAgent(type: string, execute: Agent["execute"]) {
  implementations.set(type, execute);
}

export function loadAgent(record: Pick<Agent, "id" | "name" | "type" | "description" | "instructions" | "configuration">): Agent {
  const registered = implementations.get(record.type);
  return {
    ...record,
    execute: registered ?? (async () => ({
      success: true,
      output: {
        summary: `${record.name} produced a mock result for development testing.`,
        finding: "No finding is available from the development mock.",
        recommendation: "NOT_APPLICABLE",
        rationale: "This mock does not contact external services or make an underwriting decision.",
        reasoning: "No external evidence was gathered.",
        nextAction: "Run the agent with a configured capability to gather evidence.",
      },
      findings: [],
      evidence: [{ source: "Mock agent runner", detail: "Development mock; no external verification performed.", reference: "" }],
    })),
  };
}

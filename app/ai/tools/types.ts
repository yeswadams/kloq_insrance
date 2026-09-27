import type { z } from "zod";

export const toolEvidenceKinds = ["portal_result", "page_text", "screenshot"] as const;
export type ToolEvidence = { type: typeof toolEvidenceKinds[number]; source: string; description: string; reference?: string };
export type ToolResult<T = unknown, Q = unknown> = {
  success: boolean;
  source: string;
  query: Q;
  result: T | null;
  evidence: ToolEvidence[];
  error?: string;
};

/** Predictable tool contract: named capability, Zod input/output, and one validated execute function. */
export type RegisteredTool = {
  id: string;
  name: string;
  slug: string;
  capability: string;
  description: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  execute(input: unknown, onEvent?: (event: { type: string; message: string; data?: Record<string, unknown> }) => void): Promise<unknown>;
};

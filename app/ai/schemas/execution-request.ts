import { z } from "zod";

export const executionRequestSchema = z.object({
  agentId: z.string().uuid(),
  proposalId: z.string().uuid(),
  mode: z.enum(["auto", "mock", "groq"]).default("auto"),
}).strict();

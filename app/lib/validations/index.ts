import { z } from "zod";
export const proposalStatusSchema = z.enum(["PENDING", "EVALUATING", "UNDER_REVIEW", "APPROVED", "REJECTED", "FLAGGED", "REQUESTED_EVIDENCE"]);
export const proposalIdSchema = z.string().uuid();
export const agentIdSchema = z.string().uuid();
export const proposalListQuerySchema = z.object({ search: z.string().trim().max(160).default(""), status: z.union([proposalStatusSchema, z.literal("ALL")]).default("ALL") });
export const agentTypeSchema = z.string().trim().min(1).max(80);
export const createProposalSchema = z.object({ companyName: z.string().trim().min(2).max(160), kraPin: z.string().trim().min(5).max(24), fleetSize: z.coerce.number().int().min(1).max(100000) });
export const updateProposalSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  kraPin: z.string().trim().min(5).max(24).optional(),
  fleetSize: z.coerce.number().int().min(1).max(100000).optional(),
}).refine((input) => Object.keys(input).length > 0, "At least one proposal field is required");
export const updateProposalStatusSchema = z.object({ status: proposalStatusSchema });
export const createAgentSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().min(2).max(500), type: agentTypeSchema, instructions: z.string().max(8000).default(""), enabled: z.boolean().default(true), configuration: z.record(z.string(), z.unknown()).default({}) });
export const updateAgentSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), description: z.string().trim().min(2).max(500).optional(), type: agentTypeSchema.optional(), instructions: z.string().max(8000).optional(), configuration: z.record(z.string(), z.unknown()).optional() }).refine((input) => Object.keys(input).length > 0, "At least one agent field is required");
export const setAgentEnabledSchema = z.object({ enabled: z.boolean() });
export const underwritingDecisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED", "REQUESTED_EVIDENCE", "FLAGGED"]), reason: z.string().trim().min(3).max(2000) });
export { agentResultSchema } from "@/app/ai/schemas/agent-result";
export type CreateProposal = z.infer<typeof createProposalSchema>;
export type UpdateProposal = z.infer<typeof updateProposalSchema>;
export type CreateAgent = z.infer<typeof createAgentSchema>;
export type UpdateAgent = z.infer<typeof updateAgentSchema>;

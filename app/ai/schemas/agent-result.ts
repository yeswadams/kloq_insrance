import { z } from "zod";

const recommendationSchema = z.enum([
  "APPROVE",
  "MANUAL_REVIEW",
  "DECLINE",
  "NOT_APPLICABLE",
]);
const evidenceItemSchema = z.object({
  source: z.string().trim().min(1).max(240),
  detail: z.string().trim().min(1).max(1200),
  reference: z.string().trim().max(500),
}).strict();
const findingSchema = z.object({
  category: z.string().trim().min(1).max(80),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(2000),
  evidence: z.array(evidenceItemSchema).max(10),
}).strict();

/** The exact, validated result shape accepted by the execution persistence layer. */
export const agentResultSchema = z.object({
  success: z.boolean(),
  output: z.object({
    summary: z.string().trim().min(1).max(3000),
    finding: z.string().trim().min(1).max(2000),
    recommendation: recommendationSchema,
    rationale: z.string().trim().min(1).max(3000),
    reasoning: z.string().trim().min(1).max(3000),
    nextAction: z.string().trim().min(1).max(2000),
  }).strict(),
  findings: z.array(findingSchema).max(30),
  evidence: z.array(evidenceItemSchema).max(30),
}).strict();

/** Kept JSON-Schema-friendly for providers that support strict structured output. */
export const agentResultGenerationSchema = z.object({
  success: z.boolean(),
  output: z.object({
    summary: z.string(),
    finding: z.string(),
    recommendation: recommendationSchema,
    rationale: z.string(),
    reasoning: z.string(),
    nextAction: z.string(),
  }).strict(),
  findings: z.array(z.object({
    category: z.string(),
    severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    title: z.string(),
    description: z.string(),
    evidence: z.array(z.object({ source: z.string(), detail: z.string(), reference: z.string() }).strict()),
  }).strict()),
  evidence: z.array(z.object({ source: z.string(), detail: z.string(), reference: z.string() }).strict()),
}).strict();

export type AgentResult = z.infer<typeof agentResultSchema>;
export type AgentFinding = z.infer<typeof findingSchema>;
export type AgentEvidence = z.infer<typeof evidenceItemSchema>;

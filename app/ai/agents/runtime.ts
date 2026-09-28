import { Output, generateText } from "ai";
import { z } from "zod";
import { agentResultGenerationSchema, agentResultSchema, type AgentEvidence, type AgentResult } from "@/app/ai/schemas/agent-result";
import { getGroqModel } from "@/app/ai/providers/groq";
import { executeTool, listTools } from "@/app/ai/tools/registry";
import { registerBrowserTool } from "@/app/ai/tools/browser/browser-tool";
import type { BrowserAction } from "@/app/ai/tools/browser/adapters/browser-adapter";
import { isBrowserRuntimeConfigured } from "@/app/ai/tools/browser/config";

export type RuntimeEvent = { type: string; message: string; data?: Record<string, unknown> };
type RuntimeEventHandler = (event: RuntimeEvent) => void;
const plannerSchema = z.object({ needsExternalVerification: z.boolean(), explanation: z.string().min(1), capability: z.string().nullable() }).strict();
const kraRecordSchema = z.object({
  kraPin: z.string(), companyName: z.string().nullable(), status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PENDING_REVIEW", "NO_RECORD"]),
  obligations: z.array(z.string()), lastFiling: z.string(),
}).strict();

function extractPin(task: string) { return task.match(/\b[A-Z]\d{9}[A-Z]\b/i)?.[0]?.toUpperCase() ?? ""; }
function hasVerificationIntent(task: string) { return /\b(verify|check|confirm|validate|look\s*up|compliance|registration|tax status)\b/i.test(task); }

function failedResult(finding: string, nextAction: string, category: string): AgentResult {
  return agentResultSchema.parse({
    success: false,
    output: { summary: finding, finding, recommendation: "MANUAL_REVIEW", rationale: "No verified portal evidence was available, so no compliance conclusion was made.", reasoning: "A verification conclusion requires evidence returned by the Qlo-Africa mock portal. This run did not produce that evidence.", nextAction },
    findings: [{ category, severity: "MEDIUM", title: "Verification not completed", description: finding, evidence: [] }], evidence: [],
  });
}

function recordResult(record: Record<string, unknown>, evidence: AgentEvidence[]): AgentResult {
  const status = String(record.status ?? "NO_RECORD");
  const pin = String(record.kraPin ?? "the submitted PIN");
  const company = String(record.companyName ?? "No matching taxpayer record");
  const obligations = Array.isArray(record.obligations) ? record.obligations.map(String) : [];
  const lastFiling = String(record.lastFiling ?? "Not reported");
  const compliant = status === "COMPLIANT";
  const pending = status === "PENDING_REVIEW";
  const finding = compliant
    ? `Tax compliance verified in the Qlo-Africa verification environment for ${company}.`
    : `The Qlo-Africa verification environment returned ${status.replaceAll("_", " ")} for ${pin}.`;
  const reasoning = compliant
    ? `The mock portal associates ${pin} with ${company}, reports COMPLIANT status, lists ${obligations.join(", ") || "no obligations"}, and marks the last filing as ${lastFiling}.`
    : pending
      ? `The mock portal reports that this record is pending review; this is not a compliance confirmation. Listed obligations: ${obligations.join(", ") || "none"}.`
      : `The mock portal did not report compliant status for ${pin}. Status: ${status}. Listed obligations: ${obligations.join(", ") || "none"}.`;
  return agentResultSchema.parse({
    success: true,
    output: {
      summary: finding,
      finding,
      recommendation: "MANUAL_REVIEW",
      rationale: "This is fictional demo evidence from the Qlo-Africa verification environment, not a response from a government system.",
      reasoning,
      nextAction: compliant ? "No tax-compliance exception was identified by this demo check; continue human underwriting review." : "Review the result with the applicant and request authoritative supporting evidence before making an underwriting decision.",
    },
    findings: [{ category: "TAX_COMPLIANCE", severity: compliant ? "INFO" : pending ? "MEDIUM" : "HIGH", title: compliant ? "Demo tax record reports compliant" : `Demo tax record reports ${status.replaceAll("_", " ")}`, description: finding, evidence }],
    evidence,
  });
}

export async function runAgentTask(input: {
  agent: { name: string; type: string; instructions: string; configuration: Record<string, unknown> };
  task: string;
  proposal?: { id: string; companyName: string; kraPin: string; fleetSize: number } | null;
  mode?: "auto" | "mock" | "groq";
  onEvent?: RuntimeEventHandler;
}): Promise<{ result: AgentResult; events: RuntimeEvent[] }> {
  registerBrowserTool();
  const registered = listTools();
  const disabled = Array.isArray(input.agent.configuration.disabledCapabilities) ? input.agent.configuration.disabledCapabilities.filter((item): item is string => typeof item === "string") : [];
  const availableTools = registered.filter((tool) => !disabled.includes(tool.capability));
  const externalIntent = hasVerificationIntent(input.task);
  let plan: z.infer<typeof plannerSchema> = {
    needsExternalVerification: externalIntent,
    explanation: externalIntent ? "I understand this task requires checking a verification source." : "I have reviewed the request and will determine whether an external capability is needed.",
    capability: externalIntent ? "browser" : null,
  };

  if ((input.mode === "groq" || (input.mode !== "mock" && !!process.env.GROQ_API_KEY))) {
    try {
      const planned = await generateText({
        model: getGroqModel(), output: Output.object({ schema: plannerSchema }),
        system: `Plan this task for ${input.agent.name}. Available tools: ${JSON.stringify(availableTools)}. Identify the capability required. You may only select a listed capability. Do not claim to have executed any tool. Agent instructions: ${input.agent.instructions}`,
        prompt: JSON.stringify({ task: input.task, proposal: input.proposal ?? null }), maxRetries: 1,
      });
      plan = plannerSchema.parse(planned.output);
      if (externalIntent) plan = { ...plan, needsExternalVerification: true, capability: availableTools.some((tool) => tool.capability === "browser") ? "browser" : null };
      if (externalIntent) plan.explanation = "I need to verify the supplied information against the available portal.";
    } catch { /* Keep the deterministic plan if the optional model planner is unavailable. */ }
  }

  const events: RuntimeEvent[] = [
    { type: "understanding", message: plan.explanation },
    { type: "capability_check", message: `Checking available capabilities for ${input.agent.name}.` },
    { type: "tools_discovered", message: availableTools.length ? `Available tools: ${availableTools.map((tool) => tool.name).join(", ")}.` : "No tools are currently enabled for this agent." },
  ];
  for (const event of events) input.onEvent?.(event);
  const emit = (event: RuntimeEvent) => { events.push(event); input.onEvent?.(event); };
  if (input.proposal) emit({ type: "proposal_context", message: `Using proposal context for ${input.proposal.companyName}.`, data: { proposalId: input.proposal.id } });

  if (!plan.needsExternalVerification) {
    const result = agentResultSchema.parse({ success: true, output: { summary: "No external verification was requested.", finding: "No external verification finding was generated.", recommendation: "NOT_APPLICABLE", rationale: "This task did not require a registered external capability.", reasoning: "No external tool evidence was requested or gathered.", nextAction: "Provide a verification task if you need a portal lookup." }, findings: [], evidence: [] });
    emit({ type: "finding_generated", message: "No external verification finding was needed." });
    return { result, events };
  }

  const browser = registered.find((tool) => tool.capability === "browser");
  if (disabled.includes("browser") || !availableTools.some((tool) => tool.capability === "browser") || !browser) {
    const message = "This task requires browser verification, but the required capability is currently unavailable for this agent.";
    emit({ type: "capability_unavailable", message });
    emit({ type: "finding_generated", message: "No compliance conclusion was made." });
    return { result: failedResult(message, "Enable the Browser capability for this agent, then retry the verification.", "CAPABILITY_UNAVAILABLE"), events };
  }
  if (!isBrowserRuntimeConfigured()) {
    const message = "This task requires browser verification, but the E2B browser or public mock portal is not configured.";
    emit({ type: "capability_unavailable", message });
    emit({ type: "finding_generated", message: "No compliance conclusion was made." });
    return { result: failedResult(message, "Configure E2B_API_KEY and a publicly reachable HTTPS MOCK_PORTAL_BASE_URL, then retry.", "CAPABILITY_UNAVAILABLE"), events };
  }

  const pin = extractPin(input.task) || input.proposal?.kraPin || "";
  if (!pin) {
    const message = "A KRA PIN is required to run this tax verification.";
    emit({ type: "task_input_missing", message });
    return { result: failedResult(message, "Provide the taxpayer KRA PIN and retry.", "MISSING_VERIFICATION_INPUT"), events };
  }

  emit({ type: "capability_selected", message: "Available capability selected: Browser", data: { capability: browser.capability, tool: browser.slug } });
  const actions: BrowserAction[] = [
    { action: "navigate", url: "/mock/kra" },
    { action: "inspect" },
    { action: "type", selector: "input[name='kraPin']", text: pin },
    { action: "submit", selector: "[data-testid='kra-submit']" },
    { action: "extract", selector: "[data-testid='verification-result']" },
  ];
  let toolResult;
  try {
    toolResult = await executeTool(browser.slug, { actions, query: { kraPin: pin } }, emit);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Browser verification failed.";
    emit({ type: "tool_failed", message });
    emit({ type: "finding_generated", message: "No compliance conclusion was made because the portal could not be verified." });
    return { result: failedResult("The verification portal could not be reached or browser execution failed. No compliance conclusion was made.", "Confirm the public portal URL and E2B configuration, then retry.", "VERIFICATION_UNAVAILABLE"), events };
  }

  emit({ type: "evidence_collected", message: "Evidence collected from the rendered mock portal page.", data: { source: toolResult.source, url: (toolResult.result as { url?: string }).url, query: toolResult.query } });
  const portalDataValue = (toolResult.result as { structuredRecord?: Record<string, unknown> | null }).structuredRecord;
  const parsedRecord = kraRecordSchema.safeParse(portalDataValue);
  if (!toolResult.success || !parsedRecord.success) {
    const failure = failedResult("The browser opened the verification portal but could not extract a matching result. No compliance conclusion was made.", "Retry the lookup or request supporting tax evidence from the applicant.", "VERIFICATION_RESULT_UNAVAILABLE");
    emit({ type: "tool_failed", message: "The portal page did not contain a structured verification result." });
    return { result: failure, events };
  }

  const evidence: AgentEvidence[] = toolResult.evidence.map((item) => ({ source: item.source, detail: item.description.slice(0, 1200), reference: item.reference ?? "" }));
  emit({ type: "analyzing_evidence", message: "Analyzing the portal result against the task." });
  let result = recordResult(parsedRecord.data, evidence);
  if ((input.mode === "groq" || (input.mode !== "mock" && !!process.env.GROQ_API_KEY))) {
    try {
      const reasoned = await generateText({
        model: getGroqModel(), output: Output.object({ schema: agentResultGenerationSchema }),
        system: `You are ${input.agent.name}, an underwriting assistant. Interpret only the supplied tool result and evidence. The only allowed source is the Qlo-Africa fictional verification environment; never call it a government system or suggest it is live KRA data. Never state a verification succeeded unless tool evidence contains a matching portal result. Always leave the final decision to the underwriter. Return finding, reasoning, evidence-based next action, and structured finding. Agent instructions: ${input.agent.instructions}`,
        prompt: JSON.stringify({ task: input.task, proposal: input.proposal ?? null, record: parsedRecord.data, evidence }), maxRetries: 1,
      });
      const interpretation = agentResultSchema.parse(reasoned.output);
      // Keep model-generated interpretation, but the source, execution success, evidence and finding record come from the validated browser result.
      result = agentResultSchema.parse({
        ...interpretation,
        success: true,
        output: { ...interpretation.output, recommendation: "MANUAL_REVIEW" },
        findings: result.findings,
        evidence,
      });
    } catch { /* Keep the deterministic evidence-grounded explanation if model reasoning fails. */ }
  }
  emit({ type: "finding_generated", message: result.output.finding });
  return { result, events };
}

import { NextResponse } from "next/server";
import { executionRequestSchema } from "@/app/ai/schemas/execution-request";
import { getCurrentUser } from "@/app/lib/auth/session";
import { startAgentExecution } from "@/app/server/evaluations/service";

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = executionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid execution request", issues: parsed.error.issues }, { status: 400 });
  try {
    const execution = await startAgentExecution(parsed.data.agentId, parsed.data.proposalId, parsed.data.mode);
    return NextResponse.json({ execution }, { status: execution.status === "COMPLETED" ? 201 : 502 });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Unable to start agent execution";
    const status = error === "Agent or proposal was not found" ? 404 : error === "Agent is disabled" ? 409 : 500;
    return NextResponse.json({ error }, { status });
  }
}

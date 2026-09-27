import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/session";
import { agentIdSchema, setAgentEnabledSchema } from "@/app/lib/validations";
import { setAgentEnabled } from "@/app/server/agents/service";

type RouteContext = { params: Promise<{ agentId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { agentId } = await params;
  if (!agentIdSchema.safeParse(agentId).success) return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = setAgentEnabledSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid enabled state", issues: parsed.error.issues }, { status: 400 });
  const agent = await setAgentEnabled(agentId, parsed.data.enabled, user.id);
  return agent ? NextResponse.json({ agent }) : NextResponse.json({ error: "Agent not found" }, { status: 404 });
}

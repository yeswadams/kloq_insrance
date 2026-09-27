import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/session";
import { createAgentSchema } from "@/app/lib/validations";
import { createAgent, listAgents } from "@/app/server/agents/service";

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ agents: await listAgents() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid agent", issues: parsed.error.issues }, { status: 400 });
  const agent = await createAgent(parsed.data, user.id);
  return NextResponse.json({ agent }, { status: 201 });
}

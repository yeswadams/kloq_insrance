import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/session";
import { proposalIdSchema, updateProposalStatusSchema } from "@/app/lib/validations";
import { updateProposalStatus } from "@/app/server/proposals/service";

type RouteContext = { params: Promise<{ proposalId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { proposalId } = await params;
  if (!proposalIdSchema.safeParse(proposalId).success) return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = updateProposalStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid proposal status", issues: parsed.error.issues }, { status: 400 });
  const proposal = await updateProposalStatus(proposalId, parsed.data.status, user.id);
  return proposal ? NextResponse.json({ proposal }) : NextResponse.json({ error: "Proposal not found" }, { status: 404 });
}

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { fleetProposals } from "@/app/db/schema";
import { getCurrentUser } from "@/app/lib/auth/session";
import { createProposalSchema } from "@/app/lib/validations";
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload: unknown = await request.json();
  if (typeof payload !== "object" || payload === null || !("proposalId" in payload)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const proposalId = String(payload.proposalId);
  const [proposal] = await db.select().from(fleetProposals).where(eq(fleetProposals.id, proposalId)).limit(1);
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  createProposalSchema.parse({ companyName: proposal.companyName, kraPin: proposal.kraPin, fleetSize: proposal.fleetSize });
  const evaluation = { riskScore: 50, recommendedAction: "Manual Review", rationale: "Automated evaluation is a development placeholder. Verify tax status and vehicle records before making an underwriting decision." };
  await db.update(fleetProposals).set({ status: "UNDER_REVIEW", riskScore: evaluation.riskScore, aiRecommendation: evaluation.recommendedAction, aiRationale: evaluation.rationale, updatedAt: new Date() }).where(eq(fleetProposals.id, proposal.id));
  return NextResponse.json({ success: true, evaluation });
}

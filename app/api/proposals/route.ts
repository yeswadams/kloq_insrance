import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/session";
import { createProposalSchema, proposalListQuerySchema } from "@/app/lib/validations";
import { createProposal, listProposals } from "@/app/server/proposals/service";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const parsedQuery = proposalListQuerySchema.safeParse({ search: url.searchParams.get("search") ?? "", status: url.searchParams.get("status") ?? "ALL" });
  if (!parsedQuery.success) return NextResponse.json({ error: "Invalid proposal filters", issues: parsedQuery.error.issues }, { status: 400 });
  const proposals = await listProposals(parsedQuery.data);
  return NextResponse.json({ proposals });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = createProposalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid proposal", issues: parsed.error.issues }, { status: 400 });
  const proposal = await createProposal(parsed.data, user.id);
  return NextResponse.json({ proposal }, { status: 201 });
}

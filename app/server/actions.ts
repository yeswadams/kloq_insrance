"use server";
import { redirect } from "next/navigation";
import { requireAuth } from "@/app/lib/auth/session";
import { createProposalSchema } from "@/app/lib/validations";
import { createProposal } from "@/app/server/proposals/service";
function field(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}
export async function submitProposal(form: FormData) {
  const user = await requireAuth();
  const input = createProposalSchema.parse({
    companyName: field(form, "companyName"),
    kraPin: field(form, "kraPin"),
    fleetSize: field(form, "fleetSize"),
  });
  const proposal = await createProposal(input, user.id);
  redirect(`/proposals/${proposal.id}`);
}

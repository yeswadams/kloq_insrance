import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/app/db";
import { fleetProposals } from "@/app/db/schema";
import {
  createProposalSchema,
  proposalIdSchema,
  proposalStatusSchema,
  updateProposalSchema,
  type CreateProposal,
  type UpdateProposal,
} from "@/app/lib/validations";
import { createAuditLog } from "@/app/server/audit/service";
export async function createProposal(data: CreateProposal, createdBy: string) {
  const input = createProposalSchema.parse(data);
  const id = randomUUID();
  const [proposal] = await db
    .insert(fleetProposals)
    .values({ ...input, id, createdBy })
    .returning();
  await createAuditLog({
    actorId: createdBy,
    proposalId: id,
    action: "PROPOSAL_CREATED",
    entityType: "fleet_proposal",
    entityId: id,
  });
  return proposal;
}
export async function getProposal(id: string) {
  const proposalId = proposalIdSchema.parse(id);
  const [proposal] = await db
    .select()
    .from(fleetProposals)
    .where(eq(fleetProposals.id, proposalId))
    .limit(1);
  return proposal ?? null;
}
export async function listProposals(
  filters: { search?: string; status?: string } = {},
) {
  const conditions = [];
  if (filters.status && filters.status !== "ALL") {
    const status = proposalStatusSchema.parse(filters.status);
    conditions.push(eq(fleetProposals.status, status));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(fleetProposals.companyName, term),
        ilike(fleetProposals.kraPin, term),
      )!,
    );
  }
  return db
    .select()
    .from(fleetProposals)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(fleetProposals.createdAt));
}
export async function updateProposal(
  id: string,
  data: UpdateProposal,
  actorId: string,
) {
  const proposalId = proposalIdSchema.parse(id);
  const input = updateProposalSchema.parse(data);
  const [proposal] = await db
    .update(fleetProposals)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(fleetProposals.id, proposalId))
    .returning();
  if (proposal)
    await createAuditLog({
      actorId,
      proposalId,
      action: "PROPOSAL_UPDATED",
      entityType: "fleet_proposal",
      entityId: proposalId,
      metadata: { fields: Object.keys(input) },
    });
  return proposal ?? null;
}
export async function updateProposalStatus(
  id: string,
  status: string,
  actorId: string,
) {
  const proposalId = proposalIdSchema.parse(id);
  const validStatus = proposalStatusSchema.parse(status);
  const [proposal] = await db
    .update(fleetProposals)
    .set({ status: validStatus, updatedAt: new Date() })
    .where(eq(fleetProposals.id, proposalId))
    .returning();
  if (proposal)
    await createAuditLog({
      actorId,
      proposalId,
      action: "PROPOSAL_STATUS_UPDATED",
      entityType: "fleet_proposal",
      entityId: proposalId,
      metadata: { status: validStatus },
    });
  return proposal ?? null;
}

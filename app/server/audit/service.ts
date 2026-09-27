import { randomUUID } from "node:crypto";
import { db } from "@/app/db";
import { auditLogs } from "@/app/db/schema";


export async function createAuditLog(input: {
  actorId?: string | null;
  proposalId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      actorId: input.actorId ?? null,
      proposalId: input.proposalId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    })
    .returning();
  return row;
}

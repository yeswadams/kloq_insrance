import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db";
import { agents } from "@/app/db/schema";
import { agentIdSchema, createAgentSchema, updateAgentSchema, type CreateAgent, type UpdateAgent } from "@/app/lib/validations";
import { createAuditLog } from "@/app/server/audit/service";
function slugFromName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 130) || "agent";
}
export async function createAgent(data: CreateAgent, createdBy: string) {
  const input = createAgentSchema.parse(data); const id = randomUUID();
  const baseSlug = slugFromName(input.name);
  let slug = baseSlug;
  let suffix = 2;
  while (await db.select({ id: agents.id }).from(agents).where(eq(agents.slug, slug)).limit(1).then((rows) => rows.length > 0)) {
    slug = `${baseSlug.slice(0, 140 - String(suffix).length - 1)}-${suffix++}`;
  }
  const [agent] = await db.insert(agents).values({ ...input, id, slug, createdBy }).returning();
  await createAuditLog({ actorId: createdBy, action: "AGENT_CREATED", entityType: "agent", entityId: id }); return agent;
}
export async function getAgent(id: string) { const agentId = agentIdSchema.parse(id); const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1); return agent ?? null; }
export async function listAgents() { return db.select().from(agents).orderBy(desc(agents.createdAt)); }
export async function updateAgent(id: string, data: UpdateAgent, actorId: string) {
  const agentId = agentIdSchema.parse(id);
  const input = updateAgentSchema.parse(data); const [agent] = await db.update(agents).set({ ...input, updatedAt: new Date() }).where(eq(agents.id, agentId)).returning();
  if (agent) await createAuditLog({ actorId, action: "AGENT_UPDATED", entityType: "agent", entityId: agentId, metadata: { fields: Object.keys(input) } }); return agent ?? null;
}
export async function setAgentEnabled(id: string, enabled: boolean, actorId: string) {
  const agentId = agentIdSchema.parse(id);
  const [existing] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!existing || existing.enabled === enabled) return existing ?? null;
  const [agent] = await db.update(agents).set({ enabled, updatedAt: new Date() }).where(eq(agents.id, agentId)).returning();
  if (agent) await createAuditLog({ actorId, action: enabled ? "AGENT_ENABLED" : "AGENT_DISABLED", entityType: "agent", entityId: agentId, metadata: { enabled } }); return agent ?? null;
}

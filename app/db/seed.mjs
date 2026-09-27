import "dotenv/config";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL;
console.log(url);
if (!url) throw new Error("DATABASE_URL is required");
const sql = postgres(url, { max: 1 });
const seededAgents = [
  [
    "KRA Tax Verification",
    "kra-tax-verification",
    "Checks tax compliance indicators for a fleet applicant.",
    "VERIFICATION",
  ],
  [
    "NTSA Fleet Verification",
    "ntsa-fleet-verification",
    "Reviews vehicle registration and fleet records.",
    "VERIFICATION",
  ],
  [
    "Fleet Risk Analyzer",
    "fleet-risk-analyzer",
    "Summarizes fleet exposure for underwriting review.",
    "RISK_ANALYSIS",
  ],
  [
    "Compliance Checker",
    "compliance-checker",
    "Surfaces basic compliance items for human review.",
    "COMPLIANCE",
  ],
];
try {
  for (const [name, slug, description, type] of seededAgents)
    await sql`insert into agents (id,name,slug,description,type,instructions,enabled,configuration) values (${randomUUID()},${name},${slug},${description},${type},'',true,'{}'::jsonb) on conflict (slug) do nothing`;
  const proposals = [
    ["Savannah Freight Services Ltd", "P051234567A", 42, "UNDER_REVIEW"],
    ["Highland Produce Transport Ltd", "P051234568B", 18, "PENDING"],
    ["Coastal Cold Chain Ltd", "P051234569C", 27, "FLAGGED"],
    ["Mara Building Logistics Ltd", "P051234570D", 11, "APPROVED"],
    ["Equator Courier Network Ltd", "P051234571E", 63, "REQUESTED_EVIDENCE"],
  ];
  for (const [companyName, kraPin, fleetSize, status] of proposals) {
    const [row] =
      await sql`select id from fleet_proposals where kra_pin=${kraPin} limit 1`;
    if (row) continue;
    const id = randomUUID();
    await sql`insert into fleet_proposals (id,company_name,kra_pin,fleet_size,status) values (${id},${companyName},${kraPin},${fleetSize},${status})`;
    await sql`insert into audit_logs (id,proposal_id,action,entity_type,entity_id,metadata) values (${randomUUID()},${id},'PROPOSAL_CREATED','fleet_proposal',${id},'{}'::jsonb)`;
  }
  for (const [name, slug] of seededAgents) {
    const [agent] = await sql`select id from agents where slug=${slug} limit 1`;
    const [log] =
      await sql`select id from audit_logs where entity_id=${agent.id} and action='AGENT_CREATED' limit 1`;
    if (!log)
      await sql`insert into audit_logs (id,action,entity_type,entity_id,metadata) values (${randomUUID()},'AGENT_CREATED','agent',${agent.id},${JSON.stringify({ name })}::jsonb)`;
  }
  console.log("Seeded four agents, five proposals, and audit events.");
} finally {
  await sql.end();
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db";
import { agents, agentExecutions, auditLogs, findings } from "@/app/db/schema";
import { ProposalStatusControl } from "@/app/components/proposals/proposal-status-control";
import { proposalIdSchema } from "@/app/lib/validations";
import { getProposal } from "@/app/server/proposals/service";
import { listAgents } from "@/app/server/agents/service";

export default async function ProposalDetailsPage({ params }: PageProps<"/proposals/[proposalId]">) {
  const { proposalId } = await params;
  if (!proposalIdSchema.safeParse(proposalId).success) notFound();
  const proposal = await getProposal(proposalId);
  if (!proposal) notFound();
  const [executions, proposalFindings, history, availableAgents] = await Promise.all([
    db.select({ execution: agentExecutions, agentName: agents.name }).from(agentExecutions).leftJoin(agents, eq(agentExecutions.agentId, agents.id)).where(eq(agentExecutions.proposalId, proposalId)).orderBy(desc(agentExecutions.createdAt)),
    db.select().from(findings).where(eq(findings.proposalId, proposalId)).orderBy(desc(findings.createdAt)),
    db.select().from(auditLogs).where(eq(auditLogs.proposalId, proposalId)).orderBy(desc(auditLogs.createdAt)),
    listAgents(),
  ]);

  return <>
    <div className="page-heading"><div><p className="eyebrow">PROPOSAL DETAILS</p><h1>{proposal.companyName}</h1><p className="muted">Created {proposal.createdAt.toLocaleString()}</p></div><Link className="button secondary" href="/proposals">All proposals</Link></div>
    <div className="detail-grid">
      <section className="panel detail-panel"><h2>Company and fleet information</h2><dl className="details">
        <div><dt>Company</dt><dd>{proposal.companyName}</dd></div><div><dt>KRA PIN</dt><dd>{proposal.kraPin}</dd></div><div><dt>Fleet size</dt><dd>{proposal.fleetSize} vehicles</dd></div><div><dt>Created</dt><dd>{proposal.createdAt.toLocaleDateString()}</dd></div>
      </dl></section>
      <section className="panel detail-panel"><h2>Underwriting assessment</h2><dl className="details">
        <div><dt>Risk score</dt><dd>{proposal.riskScore ?? "Not evaluated"}</dd></div><div><dt>AI recommendation</dt><dd>{proposal.aiRecommendation ?? "Pending"}</dd></div><div><dt>Human decision</dt><dd>{proposal.humanDecision ?? "Awaiting review"}</dd></div>
      </dl><h3>AI rationale</h3><p className="muted">{proposal.aiRationale ?? "No automated rationale has been recorded for this proposal."}</p>{proposal.humanDecisionReason && <><h3 className="section-subheading">Human decision reason</h3><p className="muted">{proposal.humanDecisionReason}</p></>}</section>
      <section className="panel detail-panel"><div className="section-heading-row"><h2>Current status</h2><span className="badge">{proposal.status.replaceAll("_", " ")}</span></div><ProposalStatusControl proposalId={proposal.id} status={proposal.status}/></section>
      <section className="panel detail-panel"><h2>Agent executions</h2>{executions.length ? <div className="activity-list">{executions.map(({ execution, agentName }) => <article className="activity-item" key={execution.id}><div className="section-heading-row"><strong>{agentName ?? "Agent"}</strong><span className="badge">{execution.status}</span></div><p className="muted">Started {execution.startedAt?.toLocaleString() ?? execution.createdAt.toLocaleString()}</p>{execution.error && <p className="form-error">{execution.error}</p>}{execution.output && <pre className="code-block">{JSON.stringify(execution.output, null, 2)}</pre>}</article>)}</div> : <p className="empty-message">No agent executions have been recorded for this proposal.</p>}</section>
      <section className="panel detail-panel"><h2>Open an agent with this proposal</h2><p className="muted">The selected agent receives this proposal’s company, fleet size, and KRA PIN as context.</p>{availableAgents.filter((agent) => agent.enabled).length ? <div className="proposal-agent-links">{availableAgents.filter((agent) => agent.enabled).map((agent) => <Link className="button secondary" key={agent.id} href={`/agents/${agent.id}/workspace?proposalId=${proposal.id}`}>{agent.name} <span aria-hidden>↗</span></Link>)}</div> : <p className="empty-message">No enabled agents are available.</p>}</section>
      <section className="panel detail-panel"><h2>Findings</h2>{proposalFindings.length ? <div className="activity-list">{proposalFindings.map((finding) => <article className="activity-item" key={finding.id}><div className="section-heading-row"><strong>{finding.title}</strong><span className="badge">{finding.severity}</span></div><p className="muted">{finding.category} · {finding.description}</p><p className="muted">Recorded {finding.createdAt.toLocaleString()}</p></article>)}</div> : <p className="empty-message">No findings have been recorded for this proposal.</p>}</section>
      <section className="panel detail-panel"><h2>Audit history</h2>{history.length ? <div className="activity-list">{history.map((entry) => <article className="activity-item" key={entry.id}><div className="section-heading-row"><strong>{entry.action.replaceAll("_", " ")}</strong><span className="muted">{entry.createdAt.toLocaleString()}</span></div><p className="muted">{entry.entityType} · {entry.entityId.slice(0, 8)}</p></article>)}</div> : <p className="empty-message">No audit history is available yet.</p>}</section>
    </div>
  </>;
}

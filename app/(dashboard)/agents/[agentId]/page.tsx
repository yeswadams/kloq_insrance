import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db";
import { agentExecutions, fleetProposals } from "@/app/db/schema";
import { AgentEnabledToggle } from "@/app/components/agents/agent-enabled-toggle";
import { agentIdSchema } from "@/app/lib/validations";
import { getAgent } from "@/app/server/agents/service";

export default async function AgentDetailsPage({ params }: PageProps<"/agents/[agentId]">) {
  const { agentId } = await params;
  if (!agentIdSchema.safeParse(agentId).success) notFound();
  const agent = await getAgent(agentId);
  if (!agent) notFound();
  const executions = await db.select({ execution: agentExecutions, companyName: fleetProposals.companyName }).from(agentExecutions).leftJoin(fleetProposals, eq(agentExecutions.proposalId, fleetProposals.id)).where(eq(agentExecutions.agentId, agentId)).orderBy(desc(agentExecutions.createdAt));

  return <>
    <div className="page-heading"><div><p className="eyebrow">AGENT CONFIGURATION</p><h1>{agent.name}</h1><p className="muted">{agent.description}</p></div><div className="agent-detail-actions"><Link className="button primary" href={`/agents/${agent.id}/workspace`}>Open workspace</Link><Link className="button secondary" href={`/agents/${agent.id}/edit`}>Edit agent</Link><AgentEnabledToggle id={agent.id} enabled={agent.enabled}/></div></div>
    <div className="detail-grid">
      <section className="panel detail-panel"><h2>Agent details</h2><dl className="details"><div><dt>Name</dt><dd>{agent.name}</dd></div><div><dt>Slug</dt><dd>{agent.slug}</dd></div><div><dt>Type</dt><dd>{agent.type}</dd></div><div><dt>Status</dt><dd><span className={`state-pill ${agent.enabled ? "enabled" : "disabled"}`}>{agent.enabled ? "Enabled" : "Disabled"}</span></dd></div><div><dt>Created</dt><dd>{agent.createdAt.toLocaleString()}</dd></div></dl></section>
      <section className="panel detail-panel"><h2>Instructions</h2><p className="muted preserve-lines">{agent.instructions || "No instructions have been configured."}</p></section>
      <section className="panel detail-panel"><h2>Configuration</h2><pre className="code-block">{JSON.stringify(agent.configuration, null, 2)}</pre></section>
      <section className="panel detail-panel"><h2>Execution history</h2>{executions.length ? <div className="activity-list">{executions.map(({ execution, companyName }) => <article className="activity-item" key={execution.id}><div className="section-heading-row"><strong>{companyName ?? (execution.conversationId ? "Agent conversation" : "Proposal")}</strong><span className="badge">{execution.status}</span></div><p className="muted">Created {execution.createdAt.toLocaleString()}</p>{execution.startedAt && <p className="muted">Started {execution.startedAt.toLocaleString()}{execution.completedAt ? ` · Completed ${execution.completedAt.toLocaleString()}` : ""}</p>}{execution.error && <p className="form-error">{execution.error}</p>}{execution.output && <pre className="code-block">{JSON.stringify(execution.output, null, 2)}</pre>}{companyName && <Link className="text-link" href={`/proposals/${execution.proposalId}`}>View proposal</Link>}{execution.conversationId && <Link className="text-link" href={`/agents/${agent.id}/workspace?conversationId=${execution.conversationId}${execution.proposalId ? `&proposalId=${execution.proposalId}` : ""}`}>Open conversation</Link>}</article>)}</div> : <p className="empty-message">This agent has no execution history yet.</p>}</section>
    </div>
    <Link className="text-link back-link" href="/agents">← Back to agents</Link>
  </>;
}

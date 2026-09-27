import Link from "next/link";
import { listAgents } from "@/app/server/agents/service";
import { AgentEnabledToggle } from "@/app/components/agents/agent-enabled-toggle";

export default async function AgentsPage() {
  const rows = await listAgents();
  return <>
    <div className="page-heading"><div><p className="eyebrow">AUTOMATION</p><h1>Agents</h1><p className="muted">Configure reusable underwriting agents.</p></div><Link href="/agents/new" className="button primary">Create agent</Link></div>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Description</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
      {rows.map((agent) => <tr key={agent.id}>
        <td><Link className="table-link" href={`/agents/${agent.id}`}>{agent.name}</Link></td><td>{agent.type.replaceAll("_", " ")}</td><td className="agent-description-cell">{agent.description}</td>
        <td><span className={`state-pill ${agent.enabled ? "enabled" : "disabled"}`}>{agent.enabled ? "Enabled" : "Disabled"}</span></td><td>{agent.createdAt.toLocaleDateString()}</td>
        <td className="agent-actions"><Link className="text-link" href={`/agents/${agent.id}`}>View</Link><AgentEnabledToggle id={agent.id} enabled={agent.enabled} compact/></td>
      </tr>)}
      {!rows.length && <tr><td colSpan={6} className="empty-cell">No agents yet. Create an agent to get started.</td></tr>}
    </tbody></table></div></section>
  </>;
}

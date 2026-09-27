import { AgentForm } from "@/app/components/agents/agent-form";

export default function NewAgentPage() {
  return <>
    <div className="page-heading"><div><p className="eyebrow">AUTOMATION</p><h1>Create agent</h1><p className="muted">Add an agent to the underwriting workspace.</p></div></div>
    <AgentForm/>
  </>;
}

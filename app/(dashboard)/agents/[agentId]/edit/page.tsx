import { notFound } from "next/navigation";
import { AgentForm } from "@/app/components/agents/agent-form";
import { agentIdSchema } from "@/app/lib/validations";
import { getAgent } from "@/app/server/agents/service";

export default async function EditAgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  if (!agentIdSchema.safeParse(agentId).success) notFound();
  const agent = await getAgent(agentId);
  if (!agent) notFound();
  return <>
    <div className="page-heading"><div><p className="eyebrow">AUTOMATION</p><h1>Edit agent</h1><p className="muted">Update {agent.name} configuration.</p></div></div>
    <AgentForm initial={{ id: agent.id, name: agent.name, description: agent.description, type: agent.type, instructions: agent.instructions, enabled: agent.enabled, configuration: agent.configuration }}/>
  </>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { agentIdSchema } from "@/app/lib/validations";
import { getAgent } from "@/app/server/agents/service";
import { getCurrentUser } from "@/app/lib/auth/session";
import { getConversation, listConversationMessages } from "@/app/server/conversations/service";
import { AgentChat } from "@/app/components/workspace/agent-chat";
import { registerBrowserTool } from "@/app/ai/tools/browser/browser-tool";
import { listTools } from "@/app/ai/tools/registry";
import { getProposal } from "@/app/server/proposals/service";
import { isBrowserRuntimeConfigured } from "@/app/ai/tools/browser/config";

export default async function AgentWorkspacePage({ params, searchParams }: { params: Promise<{ agentId: string }>; searchParams: Promise<{ conversationId?: string; proposalId?: string }> }) {
  const { agentId } = await params;
  const query = await searchParams;
  if (!agentIdSchema.safeParse(agentId).success) notFound();
  const agent = await getAgent(agentId);
  if (!agent) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const proposal = query.proposalId ? await getProposal(query.proposalId) : null;
  if (query.proposalId && !proposal) notFound();
  let conversationId: string | undefined;
  let initialMessages: Awaited<ReturnType<typeof listConversationMessages>> = [];
  if (query.conversationId) {
    const conversation = await getConversation(query.conversationId, user.id);
    if (conversation?.agentId === agentId && (conversation.proposalId ?? null) === (query.proposalId ?? null)) {
      conversationId = conversation.id;
      initialMessages = await listConversationMessages(conversation.id);
    }
  }
  registerBrowserTool();
  const disabledCapabilities = Array.isArray(agent.configuration.disabledCapabilities) ? agent.configuration.disabledCapabilities.filter((item): item is string => typeof item === "string") : [];
  const availableCapabilities = listTools().filter((tool) => !disabledCapabilities.includes(tool.capability)).map((tool) => ({ ...tool, ready: tool.capability !== "browser" || isBrowserRuntimeConfigured() }));
  return <>
    <div className="page-heading workspace-heading"><div><p className="eyebrow">AGENT WORKSPACE · {agent.type.replaceAll("_", " ")}</p><h1>{agent.name}</h1><p className="muted">{agent.description}</p></div><div className="workspace-heading-actions"><span className={`state-pill ${agent.enabled ? "enabled" : "disabled"}`}>{agent.enabled ? "Enabled" : "Disabled"}</span><Link className="button secondary" href={`/agents/${agent.id}`}>Agent details</Link></div></div>
    {agent.enabled ? <AgentChat agentId={agent.id} proposalId={proposal?.id} proposalName={proposal?.companyName} conversationId={conversationId} initialMessages={initialMessages.map((message) => ({ ...message, events: message.events }))} availableCapabilities={availableCapabilities}/> : <div className="panel empty-message">This agent is disabled. Enable it from agent details before starting a conversation.</div>}
  </>;
}

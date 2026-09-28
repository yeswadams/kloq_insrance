"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; role: string; content: string; events: Record<string, unknown>[]; agentExecutionId?: string | null };

export function AgentChat({ agentId, proposalId, proposalName, conversationId, initialMessages, availableCapabilities }: { agentId: string; proposalId?: string; proposalName?: string; conversationId?: string; initialMessages: Message[]; availableCapabilities: { name: string; slug: string; capability: string; description: string; ready: boolean }[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [currentConversation, setCurrentConversation] = useState(conversationId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true); setError(""); setText("");
    const userPendingId = `pending-user-${Date.now()}`;
    const pendingId = `pending-agent-${Date.now()}`;
    setMessages((items) => [...items, { id: userPendingId, role: "user", content, events: [] }, { id: pendingId, role: "assistant", content: "", events: [] }]);
    try {
      const response = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId, proposalId, conversationId: currentConversation, content }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to send message");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const type = frame.match(/^event: (.+)$/m)?.[1];
          const raw = frame.match(/^data: (.+)$/m)?.[1];
          if (!type || !raw) continue;
          const payload = JSON.parse(raw);
          if (type === "progress") {
            setMessages((items) => items.map((message) => message.id === pendingId ? { ...message, events: [...message.events, payload] } : message));
          } else if (type === "complete") {
            setCurrentConversation(payload.conversationId);
            setMessages((items) => [...items.filter((message) => message.id !== pendingId && message.id !== userPendingId), { id: userPendingId, role: "user", content, events: [] }, payload.message]);
            if (!currentConversation) router.replace(`/agents/${agentId}/workspace?conversationId=${payload.conversationId}${proposalId ? `&proposalId=${proposalId}` : ""}`);
            finished = true;
          } else if (type === "error") throw new Error(payload.error ?? "The agent could not complete the task.");
        }
        if (done) break;
      }
      if (!finished) throw new Error("The agent connection ended before the task completed. Retry the task.");
    } catch (cause) {
      setMessages((items) => items.filter((message) => message.id !== pendingId && message.id !== userPendingId));
      setError(cause instanceof Error ? cause.message : "Unable to send message");
    } finally { setBusy(false); }
  }

  return <div className="workspace-layout">
    <section className="panel chat-panel">
      {proposalName && <div className="proposal-context-banner"><span className="eyebrow">PROPOSAL CONTEXT</span><strong>{proposalName}</strong><span className="muted">The agent can use this proposal’s saved company and KRA PIN.</span></div>}
      <div className="chat-messages">
        {messages.length === 0 && <div className="chat-welcome"><span className="eyebrow">UNDERWRITING ASSISTANT</span><h2>What should I investigate?</h2><p className="muted">Give the agent a task. It will check its available capabilities, gather evidence, and explain what it found.</p><button className="suggestion" type="button" onClick={() => setText("Verify the KRA tax compliance status of Savannah Freight Services Ltd using KRA PIN P051234567A.")}>Try the KRA verification demo <span>↗</span></button></div>}
        {messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-role">{message.role === "user" ? "YOU" : "AGENT"}</div>
          {message.role === "assistant" ? <>
            {message.events.map((event, index) => <div className={`runtime-event event-${String(event.type ?? "activity")}`} key={`${message.id}-${index}`}><span className="event-check">{String(event.type).includes("failed") || String(event.type).includes("unavailable") ? "!" : "✓"}</span><div><strong>{String(event.message ?? "Agent activity")}</strong>{event.type === "evidence_collected" && typeof (event.data as Record<string, unknown> | undefined)?.url === "string" && <a className="text-link event-link" href={String((event.data as Record<string, unknown>).url)} target="_blank" rel="noreferrer">Open mock portal ↗</a>}</div></div>)}
            {!message.content && <div className="runtime-event"><span className="thinking-dot"/><div><strong>{message.events.length ? "Task in progress…" : "Preparing agent task…"}</strong></div></div>}
            <div className="assistant-answer">{message.content.split(/\n\n/).map((section, index) => { const [heading, ...lines] = section.split("\n"); return <section className="answer-section" key={index}><h3>{heading}</h3><p>{lines.join("\n")}</p></section>; })}</div>
            {message.agentExecutionId && <div className="execution-reference">EXECUTION {message.agentExecutionId}</div>}
          </> : <p>{message.content}</p>}
        </article>)}
        {busy && <div className="agent-thinking"><span className="thinking-dot"/>Checking task and available capabilities…</div>}
      </div>
      {error && <p className="form-error chat-error">{error}</p>}
      <form className="chat-composer" onSubmit={send}><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask the agent to investigate a risk or verify information…" rows={2} maxLength={4000}/><div className="composer-footer"><span className="muted">The underwriter makes the final decision.</span><button className="button primary" disabled={busy || text.trim().length < 3}>{busy ? "Investigating…" : "Send task"}</button></div></form>
    </section>
    <aside className="panel workspace-context"><span className="eyebrow">AVAILABLE CAPABILITIES</span><h2>Agent tools</h2>{availableCapabilities.length ? <div className="capability-list">{availableCapabilities.map((tool) => <div className="capability-card" key={tool.slug}><span className="capability-icon">{tool.capability === "browser" ? "◉" : "◇"}</span><div><strong>{tool.name}</strong><small>{tool.description}</small></div><span className={`capability-state ${tool.ready ? "" : "not-ready"}`}>{tool.ready ? "READY" : "SETUP REQUIRED"}</span></div>)}</div> : <p className="muted">No tools are enabled for this agent.</p>}<p>Evidence is collected before the agent explains its finding. The underwriter makes the final decision.</p></aside>
  </div>;
}

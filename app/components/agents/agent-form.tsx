"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type AgentFormValues = { id?: string; name: string; description: string; type: string; instructions: string; enabled: boolean; configuration: Record<string, unknown> };

export function AgentForm({ initial }: { initial?: AgentFormValues }) {
  const router = useRouter(); const editing = Boolean(initial?.id);
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    let configuration: unknown;
    try { configuration = JSON.parse(String(form.get("configuration") ?? "{}")); }
    catch { setError("Configuration must be valid JSON."); setPending(false); return; }
    if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration)) {
      setError("Configuration must be a JSON object."); setPending(false); return;
    }
    const body = { name: form.get("name"), description: form.get("description"), type: form.get("type"), instructions: form.get("instructions"), configuration, ...(!editing && { enabled: form.get("enabled") === "on" }) };
    try {
      const response = await fetch(editing ? `/api/agents/${initial!.id}` : "/api/agents", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to save agent."); return; }
      router.push(`/agents/${result.agent.id}`); router.refresh();
    } catch { setError("Unable to reach the server. Please try again."); }
    finally { setPending(false); }
  }
  return <section className="panel form-panel"><form className="form-stack" onSubmit={submit}>
    <label>Name<input name="name" required minLength={2} maxLength={120} defaultValue={initial?.name ?? ""} placeholder="e.g. Corporate Claims History Analyzer"/></label>
    <label>Description<textarea name="description" required minLength={2} maxLength={500} rows={3} defaultValue={initial?.description ?? ""}/></label>
    <label>Type<input name="type" required minLength={1} maxLength={80} defaultValue={initial?.type ?? "GENERAL"} placeholder="GENERAL, VERIFICATION, or a custom type"/></label>
    <label>Instructions<textarea name="instructions" maxLength={8000} rows={5} defaultValue={initial?.instructions ?? ""} placeholder="Optional instructions for this agent."/></label>
    {!editing && <label className="checkbox-field"><input name="enabled" type="checkbox" defaultChecked/> Enabled when created</label>}
    <label>Configuration (JSON)<textarea name="configuration" rows={7} spellCheck={false} defaultValue={JSON.stringify(initial?.configuration ?? {}, null, 2)}/><small className="field-help">Use <code>{'{"disabledCapabilities":["browser"]}'}</code> to test how this agent responds when Browser is unavailable.</small></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><Link className="button secondary" href={editing ? `/agents/${initial!.id}` : "/agents"}>Cancel</Link><button className="button primary" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create agent"}</button></div>
  </form></section>;
}

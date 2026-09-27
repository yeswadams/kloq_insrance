"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AgentEnabledToggle({ id, enabled, compact = false }: { id: string; enabled: boolean; compact?: boolean }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function toggle() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/agents/${id}/enabled`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to change agent status."); return; }
      router.refresh();
    } catch { setError("Unable to reach the server. Please try again."); }
    finally { setPending(false); }
  }
  return <div className="agent-toggle"><button className={`button ${compact ? "secondary small" : "primary"}`} onClick={toggle} disabled={pending}>{pending ? "Saving…" : enabled ? "Disable agent" : "Enable agent"}</button>{error && <span className="form-error">{error}</span>}</div>;
}

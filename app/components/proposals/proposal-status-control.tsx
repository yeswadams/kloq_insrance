"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const statuses = ["PENDING", "EVALUATING", "UNDER_REVIEW", "APPROVED", "REJECTED", "FLAGGED", "REQUESTED_EVIDENCE"] as const;
export function ProposalStatusControl({ proposalId, status }: { proposalId: string; status: string }) {
  const router = useRouter(); const [value, setValue] = useState(status); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function saveStatus() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/proposals/${proposalId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) });
      if (!response.ok) { const body = await response.json(); setError(body.error ?? "Unable to update status"); return; }
      router.refresh();
    } catch { setError("Unable to reach the server. Please try again."); }
    finally { setPending(false); }
  }
  return <div className="status-editor"><label className="sr-only" htmlFor="proposal-status">Proposal status</label><select id="proposal-status" value={value} onChange={(event) => setValue(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><button className="button secondary small" onClick={saveStatus} disabled={pending || value === status}>{pending ? "Saving…" : "Update status"}</button>{error && <span className="form-error">{error}</span>}</div>;
}

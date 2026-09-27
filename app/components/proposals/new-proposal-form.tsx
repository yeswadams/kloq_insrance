"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function NewProposalForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: formData.get("companyName"), kraPin: formData.get("kraPin"), fleetSize: formData.get("fleetSize") }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Unable to create proposal"); return; }
      router.push(`/proposals/${result.proposal.id}`); router.refresh();
    } catch { setError("Unable to reach the server. Please try again."); }
    finally { setPending(false); }
  }
  return <section className="panel form-panel"><form onSubmit={submit} className="form-stack">
    <label>Company name<input name="companyName" required minLength={2} maxLength={160} placeholder="e.g. Rift Valley Logistics Ltd"/></label>
    <label>KRA PIN<input name="kraPin" required minLength={5} maxLength={24} placeholder="e.g. P051234567X"/></label>
    <label>Fleet size<input name="fleetSize" type="number" required min={1} max={100000} placeholder="Number of vehicles"/></label>
    {error && <p className="form-error">{error}</p>}
    <div className="form-actions"><Link className="button secondary" href="/proposals">Cancel</Link><button className="button primary" disabled={pending}>{pending ? "Creating…" : "Create proposal"}</button></div>
  </form></section>;
}

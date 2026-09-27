"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { fleetProposals } from "@/app/db/schema";

type ProposalRow = typeof fleetProposals.$inferSelect;
const statuses = ["PENDING", "EVALUATING", "UNDER_REVIEW", "APPROVED", "REJECTED", "FLAGGED", "REQUESTED_EVIDENCE"] as const;

export function ProposalList({ proposals }: { proposals: ProposalRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const rows = useMemo(() => proposals.filter((proposal) => {
    const matchesSearch = `${proposal.companyName} ${proposal.kraPin}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (status === "ALL" || proposal.status === status);
  }), [proposals, search, status]);

  return <section className="panel">
    <div className="proposal-filters">
      <label className="filter-search">Search proposals<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Company or KRA PIN"/></label>
      <label className="filter-status">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Company</th><th>Fleet size</th><th>Risk score</th><th>Status</th><th>AI recommendation</th><th>Created</th><th>Actions</th></tr></thead><tbody>
      {rows.map((proposal) => <tr key={proposal.id}>
        <td><Link className="table-link" href={`/proposals/${proposal.id}`}>{proposal.companyName}</Link></td>
        <td>{proposal.fleetSize}</td><td>{proposal.riskScore ?? "—"}</td>
        <td><span className="badge">{proposal.status.replaceAll("_", " ")}</span></td>
        <td>{proposal.aiRecommendation ?? "Pending"}</td><td>{proposal.createdAt.toLocaleDateString()}</td>
        <td><Link className="text-link" href={`/proposals/${proposal.id}`}>View</Link></td>
      </tr>)}
      {!rows.length && <tr><td colSpan={7} className="empty-cell">{proposals.length ? "No proposals match these filters." : "No proposals yet. Create a proposal to get started."}</td></tr>}
    </tbody></table></div>
  </section>;
}

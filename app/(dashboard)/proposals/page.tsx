import Link from "next/link";
import { Plus } from "lucide-react";
import { ProposalList } from "@/app/components/proposals/proposal-list";
import { listProposals } from "@/app/server/proposals/service";

export default async function ProposalsPage() {
  const proposals = await listProposals();
  return <>
    <div className="page-heading"><div><p className="eyebrow">UNDERWRITING</p><h1>Proposals</h1><p className="muted">Fleet applications and underwriting status.</p></div><Link href="/proposals/new" className="button primary"><Plus size={16}/> New proposal</Link></div>
    <ProposalList proposals={proposals}/>
  </>;
}

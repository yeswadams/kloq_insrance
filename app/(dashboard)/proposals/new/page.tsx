import { NewProposalForm } from "@/app/components/proposals/new-proposal-form";

export default function NewProposalPage() {
  return <>
    <div className="page-heading"><div><p className="eyebrow">UNDERWRITING</p><h1>New proposal</h1><p className="muted">Enter company and fleet details to start an application.</p></div></div>
    <NewProposalForm/>
  </>;
}

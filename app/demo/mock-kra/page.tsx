import { redirect } from "next/navigation";
export default async function LegacyMockKra({ searchParams }: { searchParams: Promise<{ pin?: string }> }) {
  const { pin = "" } = await searchParams;
  redirect(`/mock/kra${pin ? `?kraPin=${encodeURIComponent(pin)}` : ""}`);
}

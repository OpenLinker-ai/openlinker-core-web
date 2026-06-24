import { redirect } from "next/navigation";

export default async function LegacyWebhookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string }>;
}) {
  const { id } = await params;
  const { run_id: runId } = await searchParams;
  const suffix = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  redirect(`/hub/agents/${encodeURIComponent(id)}/delivery${suffix}`);
}

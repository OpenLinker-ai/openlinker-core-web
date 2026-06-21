import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { ApprovalDecisionPanel } from "@/components/creator/approval-decision-panel";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface Approval {
  id: string;
  action: string;
  status: string;
  approval_url_slug: string;
  expires_at: string;
  payload?: Record<string, unknown>;
}

export default async function ApprovalPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const { slug } = await params;
  if (!session) redirect(`/login?callbackUrl=/hub/approvals/${encodeURIComponent(slug)}`);
  const locale = await getLocale();

  const data = await apiFetchAuthed<{ items: Approval[] }>("/api/v1/creator/approvals");
  const approval = data.items.find((item) => item.approval_url_slug === slug);
  if (!approval) notFound();

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ApprovalDecisionPanel locale={locale} approval={approval} />
      </main>
    </>
  );
}

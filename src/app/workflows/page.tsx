import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import type { WorkflowDetail } from "@/components/workflows/types";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { WORKFLOW_PAGE_COPY } from "@/messages/workflows";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: WORKFLOW_PAGE_COPY[locale].listTitle };
}

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/workflows");
  const locale = await getLocale();
  const copy = WORKFLOW_PAGE_COPY[locale];
  const data = await apiFetchAuthed<{ items: WorkflowDetail[] }>("/api/v1/workflows?size=50&sort=updated_desc");
  const items = data.items ?? [];

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <MyWorkspaceSwitcher locale={locale} />
        <section className="ol-panel ol-panel-pad mt-6">
          <h1 className="text-[22px] font-black text-[color:var(--ol-ink)]">{copy.listTitle}</h1>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--ol-muted)]">{copy.listDescription}</p>
          {items.length === 0 ? (
            <p className="mt-6 text-[13px] font-bold text-[color:var(--ol-muted)]">{copy.listEmpty}</p>
          ) : (
            <ul className="mt-5 divide-y divide-[color:var(--ol-line)]">
              {items.map((workflow) => (
                <li key={workflow.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/workflows/${encodeURIComponent(workflow.id)}`} className="text-[15px] font-black text-[color:var(--ol-primary-dark)] hover:underline">
                      {workflow.name}
                    </Link>
                    <div className="mt-0.5 text-[12px] font-semibold text-[color:var(--ol-muted)]">
                      {copy.nodes(workflow.nodes?.length ?? 0)}
                      {workflow.version ? ` · ${copy.version(workflow.version)}` : ""}
                      {` · ${workflow.status === "archived" ? copy.archived : copy.active}`}
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-[color:var(--ol-muted)]">
                    {copy.updated} {new Date(workflow.updated_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

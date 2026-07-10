import { redirect } from "next/navigation";
import type { Metadata } from "next";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import {
  type AgentOption,
  type UserTokenListResponse,
} from "@/components/settings/user-token-types";
import { UserTokensContent } from "@/components/settings/user-tokens-content";
import { Topbar } from "@/components/layout/topbar";
import { SettingsSidebarNav } from "@/components/settings/sidebar-nav";
import { SettingsSignOutButton } from "@/components/settings/sign-out-button";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { coreUserTokenMessages } from "@/messages/user-token";

export async function generateMetadata(): Promise<Metadata> {
  const copy = coreUserTokenMessages[await getLocale()];
  return { title: copy.metadataTitle, description: copy.metadataDescription };
}

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

const EMPTY_LIST: UserTokenListResponse = {
  items: [],
  total: 0,
  limit: 10,
  offset: 0,
  sort_by: "created_at",
  sort_dir: "desc",
  has_more: false,
};

export default async function UserTokensPage() {
  const session = await auth();
  if (!session?.jwt) redirect("/login?callbackUrl=/settings/user-tokens");

  const locale = await getLocale();
  const copy = coreUserTokenMessages[locale];
  const [tokenResult, agentResult] = await Promise.allSettled([
    apiFetchAuthed<UserTokenListResponse>(
      "/api/v1/user-tokens?limit=10&offset=0&sort_by=created_at&sort_dir=desc",
    ),
    apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents?limit=50&offset=0"),
  ]);

  const list = tokenResult.status === "fulfilled"
    ? normalizeTokenList(tokenResult.value)
    : EMPTY_LIST;
  const agentOptions = agentResult.status === "fulfilled"
    ? normalizeAgentOptions(agentResult.value)
    : [];

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head ol-settings-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.pageKicker}</div>
            <h1>{copy.pageHeading}</h1>
            <p>{copy.pageLead}</p>
          </div>
          <SettingsSignOutButton locale={locale} />
        </div>

        <section className="mt-6 rounded-[20px] border border-[color:var(--ol-line)] bg-white p-5">
          <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">
            {copy.boundaryTitle}
          </strong>
          <p className="mt-1 max-w-4xl text-[12.5px] font-semibold leading-6 text-[color:var(--ol-muted)]">
            {copy.boundaryBody}
          </p>
        </section>

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SettingsSidebarNav active="user-tokens" locale={locale} />
          <div className="min-w-0">
            <UserTokensContent
              initialItems={list.items}
              initialTotal={list.total}
              initialLimit={list.limit}
              initialOffset={list.offset}
              loadError={tokenResult.status === "rejected"}
              agentOptions={agentOptions}
              locale={locale}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function normalizeTokenList(value: UserTokenListResponse): UserTokenListResponse {
  return {
    ...EMPTY_LIST,
    ...value,
    items: Array.isArray(value?.items) ? value.items : [],
  };
}

function normalizeAgentOptions(payload: AgentsPayload): AgentOption[] {
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  return items.map((agent) => ({
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
  }));
}

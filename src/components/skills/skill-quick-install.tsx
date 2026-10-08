"use client";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { useBrowserOrigin } from "@/components/resources/use-browser-origin";
import { CopyContent } from "@/components/resources/copy-content";
import { skillInstallClients, skillInstallCommand, type SkillInstallClient, type SkillInstallScope } from "@/lib/skill-install.mjs";
import { skillInstallMessages } from "@/messages/skill-install";
export function SkillQuickInstall({ packageId, versionId, providers, compatible, locale, filesHref }: {
 packageId: string; versionId: string; providers: string[]; compatible: boolean; locale: Locale; filesHref: string;
}) {
 const c = skillInstallMessages[locale];
 const origin = useBrowserOrigin();
 const clients = skillInstallClients(providers);
 const [selection, setClient] = useState<SkillInstallClient>(clients[0] ?? "claude-code");
 const client = clients.includes(selection) ? selection : clients[0];
 const [scope, setScope] = useState<SkillInstallScope>("project");
 const command = skillInstallCommand({ origin, packageId, versionId, client: client ?? "claude-code", scope, providers, compatible });
 const folder = client === "claude-code" ? ".claude/skills" : ".agents/skills";
 return <section className="ol-panel min-w-0 space-y-4 p-6" aria-label={c.title}>
  <h2 className="text-lg font-bold">{c.title}</h2>
  <p className="text-sm text-[color:var(--ol-muted)]">{c.hint}</p>
  {compatible && clients.length > 0 ? <>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="space-y-2 text-sm font-semibold">{c.client}<select className="block w-full rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-3" value={client} onChange={e => setClient(e.target.value as SkillInstallClient)}>
     {clients.map(value => <option value={value} key={value}>{value === "claude-code" ? "Claude Code" : "Codex"}</option>)}
    </select></label>
    <label className="space-y-2 text-sm font-semibold">{c.scope}<select className="block w-full rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-3" value={scope} onChange={e => setScope(e.target.value as SkillInstallScope)}>
     <option value="project">{c.project}</option><option value="global">{c.global}</option>
    </select></label>
   </div>
   <p className="text-sm">{scope === "project" ? c.projectHint : c.globalHint}</p>
   <CopyContent key={command} value={command} label={c.copy} locale={locale} />
   {origin && !command && <p role="status">{c.originUnavailable}</p>}
   <p className="text-xs">{c.destination}: <code>{scope === "global" ? "~/" : "./"}{folder}/</code> · {c.configured}</p>
  </> : <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{c.unavailable}</p>}
  <Link href={filesHref} className="ol-mini-btn">{c.read}</Link>
  <details className="space-y-2 text-xs text-[color:var(--ol-muted)]"><summary className="cursor-pointer">{c.details}</summary><p>{c.interaction}</p><p>{c.extraPrompt}</p><p>{c.immutable}</p><p>{c.record}</p></details>
 </section>;
}

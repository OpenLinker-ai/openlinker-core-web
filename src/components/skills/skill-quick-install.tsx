import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { CopyContent } from "@/components/resources/copy-content";
import { skillInstallCommand, skillInstallSource } from "@/lib/skill-install.mjs";
import { skillInstallMessages } from "@/messages/skill-install";
export function SkillQuickInstall({ repositoryUrl, name, compatible, locale, filesHref }: {
 repositoryUrl?: string; name: string; compatible: boolean; locale: Locale; filesHref: string;
}) {
 const c = skillInstallMessages[locale];
 const command = skillInstallCommand({ repositoryUrl, name, compatible });
 const source = skillInstallSource({ repositoryUrl, name, compatible });
 return <section className="ol-panel min-w-0 space-y-4 p-6" aria-label={c.title}>
  <h2 className="text-lg font-bold">{c.title}</h2>
  {command ? <>
   {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="block break-words text-sm underline">{source.repository.replace("https://", "")} · {source.directory}</a>}
   <CopyContent key={command} value={command} label={c.copy} locale={locale} />
   <p className="text-sm text-[color:var(--ol-muted)]">{c.hint}</p>
   <p className="text-xs text-[color:var(--ol-muted)]">{c.upstream}</p>
  </> : <p role="status" className="text-sm text-[color:var(--ol-muted)]">{compatible ? c.unavailable : c.incompatible}</p>}
  <Link href={filesHref} className="ol-mini-btn">{c.read}</Link>
 </section>;
}

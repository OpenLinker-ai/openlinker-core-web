"use client";
import type { Locale } from "@/lib/i18n";
import { CopyContent } from "@/components/resources/copy-content";
import { useBrowserOrigin } from "@/components/resources/use-browser-origin";
import { skillPlatformCommands } from "@/lib/skill-install.mjs";
import { skillInstallMessages } from "@/messages/skill-install";
export function SkillPlatformCLI({ packageId, versionId, digest, locale }: {packageId: string; versionId: string; digest: string; locale: Locale}) {
 const c = skillInstallMessages[locale];
 const origin = useBrowserOrigin();
 const commands = skillPlatformCommands({origin, packageId, versionId, digest});
 return <details className="ol-panel min-w-0 space-y-4 p-6">
  <summary className="cursor-pointer font-bold">{c.cli}</summary>
  <p className="text-sm text-[color:var(--ol-muted)]">{c.cliHint}</p>
  {commands && <>
   <CopyContent value={commands.inspect} label={c.inspect} locale={locale} />
   <CopyContent value={commands.download} label={c.download} locale={locale} />
   <p className="text-sm">{c.permissions}</p>
   <CopyContent value={commands.login} label={c.login} locale={locale} />
   <CopyContent value={commands.import} label={c.import} locale={locale} />
   <p className="text-sm">{c.bind}</p>
  </>}
 </details>;
}

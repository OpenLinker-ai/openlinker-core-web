import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkillPackageAgents } from "@/lib/creator-agent";

import { CreatorHubFrame } from "@/components/creator/creator-hub-frame";
import { fetchCompleteSkillCatalog } from "@/lib/skill-package-catalog";
import { SkillPackages } from "@/components/skills/skill-packages";

export default async function SkillPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string; section: string }>;
  searchParams: Promise<{ version?: string | string[]; associate?: string | string[] }>;
}) {
  const { packageId, section } = await params;
  if (section !== "associate" && section !== "publish") notFound();
  const query = await searchParams;
  const initialVersionId = typeof query.version === "string" ? query.version : query.version ? "invalid" : "";
  const context = new URLSearchParams();
  if (initialVersionId) context.set("version", initialVersionId);
  const callback = `/hub/skills/${encodeURIComponent(packageId)}/${section}${context.size ? `?${context}` : ""}`;
  const session = await auth();
  if (!session?.jwt)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(callback)}`,
    );
  const locale = await getLocale();
  const [agents, skills] = await Promise.all([
    fetchSkillPackageAgents(),
    fetchCompleteSkillCatalog(locale),
  ]);
  return (
    <CreatorHubFrame active="skills" locale={locale} coreCopy>
      <SkillPackages {...{ locale, agents, skills, packageId, initialVersionId }} managementSection={section} />
    </CreatorHubFrame>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkillPackageAgents } from "@/lib/creator-agent";

import { CreatorHubFrame } from "@/components/creator/creator-hub-frame";
import { fetchCompleteSkillCatalog } from "@/lib/skill-package-catalog";
import { SkillPackages } from "@/components/skills/skill-packages";

export default async function SkillPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const session = await auth();
  if (!session?.jwt)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/hub/skills/${packageId}`)}`,
    );
  const locale = await getLocale();
  const [agents, skills] = await Promise.all([
    fetchSkillPackageAgents(),
    fetchCompleteSkillCatalog(locale),
  ]);
  return (
    <CreatorHubFrame active="skills" locale={locale} coreCopy>
      <SkillPackages {...{ locale, agents, skills, packageId }} />
    </CreatorHubFrame>
  );
}

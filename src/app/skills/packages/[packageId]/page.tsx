import { skillResourceMetadata } from "@/lib/public-resources";
import { PublicSkillPage } from "@/components/skills/public-skill-page";
import { redirectToCatalogEntry } from "@/lib/catalog-server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { packageId } = await params;
  await redirectToCatalogEntry("skills", packageId);
  return (
    <PublicSkillPage
      packageId={packageId}
      returnTo={(await searchParams)?.returnTo}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  return skillResourceMetadata(await params);
}

import { skillResourceMetadata } from "@/lib/public-resources";
import { PublicSkillPage } from "@/components/skills/public-skill-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <PublicSkillPage
      {...await params}
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

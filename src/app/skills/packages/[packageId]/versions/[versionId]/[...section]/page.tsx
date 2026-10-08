import { notFound } from "next/navigation";
import { PublicSkillPage } from "@/components/skills/public-skill-page";
import { skillSection } from "@/lib/resource-journey";
import { skillResourceMetadata } from "@/lib/public-resources";
export const dynamic = "force-dynamic";
type Params = { packageId: string; versionId: string; section: string[] };
export default async function Page({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const data = await params;
  const section = skillSection(data.section);
  if (!section || section === "overview") notFound();
  return <PublicSkillPage packageId={data.packageId} versionId={data.versionId} section={section} returnTo={(await searchParams).returnTo} />;
}
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const metadata = await skillResourceMetadata(await params);
  return { ...metadata, robots: { ...metadata.robots, index: false } };
}

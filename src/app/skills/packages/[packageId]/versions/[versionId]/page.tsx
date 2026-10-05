import { skillResourceMetadata } from "@/lib/public-resources";
import { PublicSkillPage } from "@/components/skills/public-skill-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ packageId: string; versionId: string }>;
}) {
  return <PublicSkillPage {...await params} />;
}

export async function generateMetadata({params}:{params:Promise<{packageId:string;versionId:string}>}) {return skillResourceMetadata(await params);}

import { notFound } from "next/navigation";
import { McpDetailPage } from "@/components/resources/mcp-detail-page";
import { mcpSection } from "@/lib/resource-journey";
import { mcpResourceMetadata } from "@/lib/public-resources";
export const dynamic = "force-dynamic";
type Params = { section: string };
export default async function Page({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ returnTo?: string | string[]; example?: string | string[] }> }) {
  const data = await params, query = await searchParams;
  const section = mcpSection(data.section);
  if (section !== "connect") notFound();
  return <McpDetailPage section={section} returnTo={query.returnTo} example={query.example} />;
}
export async function generateMetadata() {
  const metadata = await mcpResourceMetadata();
  return { ...metadata, robots: { ...metadata.robots, index: false } };
}

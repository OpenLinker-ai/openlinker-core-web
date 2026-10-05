import { mcpResourceMetadata } from "@/lib/public-resources";
import { McpDetailPage } from "@/components/resources/mcp-detail-page";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  return <McpDetailPage returnTo={(await searchParams)?.returnTo} />;
}

export async function generateMetadata() {
  return mcpResourceMetadata();
}

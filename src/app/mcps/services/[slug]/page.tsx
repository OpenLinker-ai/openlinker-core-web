import { mcpResourceMetadata } from "@/lib/public-resources";
import { McpDetailPage } from "@/components/resources/mcp-detail-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <McpDetailPage
      {...await params}
      returnTo={(await searchParams)?.returnTo}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return mcpResourceMetadata((await params).slug);
}

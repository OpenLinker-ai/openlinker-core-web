import { mcpResourceMetadata } from "@/lib/public-resources";
import { McpDetailPage } from "@/components/resources/mcp-detail-page";
export const dynamic = "force-dynamic";
export default function Page() {
  return <McpDetailPage />;
}

export async function generateMetadata() {return mcpResourceMetadata();}

import { proxyMcpRequest } from "@/lib/mcp-proxy";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
async function proxy(request: Request, context: Context) {
  return proxyMcpRequest(request, (await context.params).id);
}
export const POST = proxy;
export const GET = proxy;

import { getApiBaseUrlForPath } from "@/lib/api-root";
import {
  probeRuntimeIngress,
  runtimeOriginFromDiscovery,
} from "@/lib/runtime-ingress-probe.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_TTL_MS = 15_000;
const DISCOVERY_TIMEOUT_MS = 2_000;
let cached: { expiresAt: number; reachable: boolean } | null = null;
let inFlight: Promise<boolean> | null = null;

async function evaluate(): Promise<boolean> {
  try {
    const response = await fetch(
      `${getApiBaseUrlForPath("/.well-known/openlinker.json")}/.well-known/openlinker.json`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
      },
    );
    if (!response.ok) return false;
    const origin = runtimeOriginFromDiscovery(await response.json());
    return origin ? probeRuntimeIngress(origin) : false;
  } catch {
    return false;
  }
}

async function runtimeIngressReachable(): Promise<boolean> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.reachable;
  if (!inFlight) {
    inFlight = evaluate().finally(() => {
      inFlight = null;
    });
  }
  const reachable = await inFlight;
  cached = { expiresAt: Date.now() + CACHE_TTL_MS, reachable };
  return reachable;
}

function statusResponse(reachable: boolean, head = false): Response {
  const body = head ? null : JSON.stringify({ status: reachable ? "operational" : "degraded" });
  return new Response(body, {
    status: reachable ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function GET() {
  return statusResponse(await runtimeIngressReachable());
}

export async function HEAD() {
  return statusResponse(await runtimeIngressReachable(), true);
}

export const REQUIRED_PAGE_BUDGETS = new Map([
  ["src/app/(creator)/hub/agents/[id]/benchmarks/page.tsx#AgentBenchmarksPage", 2],
  ["src/app/(creator)/hub/agents/[id]/onboarding/page.tsx#AgentOnboardingPage", 2],
  ["src/app/(creator)/publish/page.tsx#PublishPage", 1],
  ["src/app/run/[id]/page.tsx#RunDetailAliasPage", 1],
]);

// These paths contain real dependencies or a conditional fallback. Every
// entry becomes stale as soon as the implementation drops below its budget.
const COMMON_DEPENDENT_WAVE_ALLOWLIST = new Map([
  ["src/app/(creator)/hub/agents/[id]/delivery/history/page.tsx#AgentDeliveryHistoryPage", 2],
  ["src/app/(creator)/hub/agents/[id]/runs/page.tsx#AgentRunsPage", 2],
  ["src/app/(user)/playground/[slug]/page.tsx#fetchPlaygroundAgent", 2],
]);

// This file stays byte-identical in both frontends, so an allowance for a page
// that only one product has is listed under that product. The other product
// keeps the default one-wave budget for the same path.
const PRODUCT_DEPENDENT_WAVE_ALLOWLISTS = new Map([
  ["openlinker-web", new Map([
    // A linked workflow's nodes are known only after the first wave; the second
    // wave reads just the node Agents that the discovery page did not include.
    ["src/app/workflow/page.tsx#WorkflowPage", 2],
  ])],
  ["openlinker-core-web", new Map()],
]);

export function dependentWaveAllowlistForProduct(packageName) {
  const productAllowlist = PRODUCT_DEPENDENT_WAVE_ALLOWLISTS.get(packageName);
  if (!productAllowlist) {
    throw new Error(`Unknown frontend product for request-wave budgets: ${packageName}`);
  }
  const allowlist = new Map(COMMON_DEPENDENT_WAVE_ALLOWLIST);
  for (const [key, budget] of productAllowlist) {
    if (allowlist.has(key)) {
      throw new Error(`${packageName} request-wave allowance repeats a common entry: ${key}`);
    }
    allowlist.set(key, budget);
  }
  return allowlist;
}

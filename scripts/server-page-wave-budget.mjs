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

export function dependentWaveAllowlistForProduct(packageName) {
  if (packageName !== "openlinker-web" && packageName !== "openlinker-core-web") {
    throw new Error(`Unknown frontend product for request-wave budgets: ${packageName}`);
  }

  const allowlist = new Map(COMMON_DEPENDENT_WAVE_ALLOWLIST);
  if (packageName === "openlinker-web") {
    // Hosted checks ownership after public lookup identifies an unlisted Agent.
    // Core has no workflow-reuse ownership query and keeps its one-wave budget.
    allowlist.set("src/app/(user)/playground/[slug]/page.tsx#PlaygroundPage", 2);
  }
  return allowlist;
}

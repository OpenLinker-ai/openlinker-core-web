export const REQUIRED_PAGE_BUDGETS = new Map([
  ["src/app/(creator)/hub/agents/[id]/benchmarks/page.tsx#AgentBenchmarksPage", 2],
  ["src/app/(creator)/hub/agents/[id]/onboarding/page.tsx#AgentOnboardingPage", 2],
  ["src/app/(creator)/publish/page.tsx#PublishPage", 1],
  ["src/app/run/[id]/page.tsx#RunDetailAliasPage", 1],
]);

// These paths contain real dependencies or a conditional fallback. Every
// entry becomes stale as soon as the implementation drops below its budget.
export const DEPENDENT_WAVE_ALLOWLIST = new Map([
  ["src/app/(creator)/hub/agents/[id]/delivery/history/page.tsx#AgentDeliveryHistoryPage", 2],
  ["src/app/(creator)/hub/agents/[id]/runs/page.tsx#AgentRunsPage", 2],
  ["src/app/(user)/playground/[slug]/page.tsx#fetchPlaygroundAgent", 2],
]);

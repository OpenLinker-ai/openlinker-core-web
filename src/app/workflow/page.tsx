import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import {
  WorkflowBuilder,
  type WorkflowSummary,
  type WorkflowMarketAgent,
} from "@/components/workflow/workflow-builder";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Workflow",
  description: "OpenLinker workflow DAG editing, execution, and step rerun entry",
};

type MarketResponse = {
  items: WorkflowMarketAgent[];
};

type WorkflowListResponse = {
  items: WorkflowSummary[];
  total: number;
};

export default async function WorkflowPage() {
  const session = await auth();
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "工作流",
          heading: "把多个真实 Agent 保存成一条可复用工作流",
          lead: "从市场 Agent 生成节点，编辑 DAG 依赖并保存到 workflow，然后按依赖调用真实 Agent。每个节点都会留下 child run，也可以对历史运行做 step 重跑和差异对比。",
        }
      : {
          home: "Home",
          current: "Workflow",
          heading: "Save multiple real Agents as a reusable workflow",
          lead: "Generate nodes from market Agents, edit DAG dependencies, save the workflow, and call real Agents by dependency order. Each node leaves a child run, and historical runs support step reruns plus comparison.",
        };
  const [market, workflows] = await Promise.all([
    apiFetch<MarketResponse>("/api/v1/agents?size=8&callable_only=true").catch(
      () => ({ items: [] as WorkflowMarketAgent[] }),
    ),
    session?.jwt
      ? apiFetch<WorkflowListResponse>("/api/v1/workflows", {
          token: session.jwt,
        }).catch(() => ({ items: [] as WorkflowSummary[], total: 0 }))
      : Promise.resolve({ items: [] as WorkflowSummary[], total: 0 }),
  ]);

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/">{copy.home}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">workflow</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <WorkflowBuilder
            initialAgents={market.items ?? []}
            initialWorkflows={workflows.items ?? []}
            initialWorkflowsTotal={workflows.total ?? workflows.items?.length ?? 0}
            locale={locale}
          />
        </div>
      </main>
    </>
  );
}

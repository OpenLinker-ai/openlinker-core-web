"use client";

/**
 * 创作者中心：我的 Agent 列表卡。
 *
 * 纯展示卡片，不发起请求。由 Server Component 父组件（hub/page.tsx）传入 agents 数据。
 *
 * 状态覆盖：pending / approved / rejected / disabled，全部展示。
 * 每行操作由子组件 <AgentRow /> 自行处理（编辑跳转、下架请求）。
 *
 * 空态：引导用户跳到 /publish 接入第一个 Agent。
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClientLocale } from "@/hooks/use-client-locale";

import { AgentRow, type AgentResponse } from "./agent-row";

export type { AgentResponse };

export function MyAgentsCard({ agents }: { agents: AgentResponse[] }) {
  const locale = useClientLocale();
  const copy =
    locale === "zh"
      ? {
          title: "我的 Agent",
          add: "+ 接入新 Agent",
          emptyPrefix: "还没有接入 Agent。",
          emptyLink: "立即接入 →",
        }
      : {
          title: "My Agents",
          add: "+ Connect new Agent",
          emptyPrefix: "No Agents connected yet.",
          emptyLink: "Connect now ->",
        };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{copy.title}</CardTitle>
        <Button asChild size="sm">
          <Link href="/publish">{copy.add}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {copy.emptyPrefix}{" "}
            <Link href="/publish" className="underline">
              {copy.emptyLink}
            </Link>
          </p>
        ) : (
          <ul className="divide-y">
            {agents.map((a) => (
              <AgentRow key={a.id} locale={locale} agent={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

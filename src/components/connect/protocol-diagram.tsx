"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

const STEPS: Record<Locale, Array<{ n: string; title: string; detail: string }>> = {
  zh: [
    { n: "1", title: "接入", detail: "Agent 所有者选择连接模式，并声明能力和 Skill" },
    { n: "2", title: "登记", detail: "保存到当前实例；只有公开 Agent 会显示在 Agent 库中" },
    { n: "3", title: "调用", detail: "用户通过 Web，或在已配置 User Token 的部署中从 SDK / MCP 发起运行" },
    { n: "4", title: "执行", detail: "当前实例按连接模式调度 Agent，并记录输出与事件" },
    { n: "5", title: "投递", detail: "运行完成后，按需把结果发送到 Slack 或 Webhook" },
  ],
  en: [
    { n: "1", title: "Connect", detail: "The Agent owner selects a connection mode and declares capabilities and Skills" },
    { n: "2", title: "Register", detail: "Save to this instance; only public Agents appear in the Registry" },
    { n: "3", title: "Invoke", detail: "Use the Web UI, or a User Token from SDK or MCP clients when the deployment supports it" },
    { n: "4", title: "Execute", detail: "This instance dispatches by connection mode and records output and events" },
    { n: "5", title: "Deliver", detail: "After the run, optionally send results to Slack or a Webhook" },
  ],
};

export function ProtocolDiagram({ locale = "zh" }: { locale?: Locale }) {
  const [tick, setTick] = useState(0);
  const steps = STEPS[locale];
  const copy =
    locale === "zh"
      ? {
          kicker: "接入流程",
          yourAgent: "你的 Agent",
          connectionModes: "4 种连接模式",
          directModes: "direct_http · mcp_server",
          runtimeModes: "runtime_ws · runtime_pull",
          waiting: "已注册 · 等待调用",
          skills: "声明的 Skill",
          currentInstance: "当前实例",
          running: "协调运行",
          runtimeFlow: "运行调度 · 回调 · 投递",
          runtimeEntries: "统一运行 · 统一记录",
          entries: "凭证与投递边界",
          userToken: "User Token → API / MCP 调用",
          agentToken: "Agent Token → Agent 注册 / 运行身份",
          webhook: "Webhook → 结果投递",
        }
      : {
          kicker: "protocol",
          yourAgent: "Your Agent",
          connectionModes: "4 connection modes",
          directModes: "direct_http · mcp_server",
          runtimeModes: "runtime_ws · runtime_pull",
          waiting: "Registered · waiting for runs",
          skills: "Declared Skills",
          currentInstance: "This instance",
          running: "Coordinating runs",
          runtimeFlow: "runtime · callback · delivery",
          runtimeEntries: "One run model · one record",
          entries: "Credential and delivery boundary",
          userToken: "User Token → API / MCP calls",
          agentToken: "Agent Token → Agent onboarding / runtime identity",
          webhook: "Webhook → result delivery",
        };

  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const loop = () => {
      setTick((Date.now() - start) % 5000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeIndex = Math.floor((tick / 5000) * steps.length) % steps.length;

  return (
    <section
      className="ol-panel ol-panel-pad"
      style={{ background: "linear-gradient(180deg, #ffffff, #f6fcfb)" }}
    >
      <div className="ol-kicker">{copy.kicker}</div>
      <div className="mt-4 grid items-stretch gap-5 xl:grid-cols-[1fr_minmax(320px,1.5fr)_1fr]">
        <div className="ol-panel" style={{ padding: 18, boxShadow: "none", borderColor: "rgba(49,118,237,0.3)" }}>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[color:var(--ol-blue)] text-white">
              <Icon name="bot" size="lg" />
            </span>
            <div>
              <div className="text-[15px] font-[900] text-[color:var(--ol-ink)]">{copy.yourAgent}</div>
              <div className="text-[12px] font-bold text-[color:var(--ol-muted)]">{copy.connectionModes}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 text-[11.5px] text-[color:var(--ol-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--ol-green)]" />
              <span className="font-bold">{copy.waiting}</span>
            </div>
            <div className="font-mono text-[11px]">{copy.directModes}</div>
            <div className="font-mono text-[11px]">{copy.runtimeModes}</div>
          </div>
          <div className="mt-3">
            <div className="ol-kicker" style={{ fontSize: 10 }}>{copy.skills}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <code className="ol-chip ol-chip-mint text-[11px]">content/summarization</code>
              <code className="ol-chip ol-chip-mint text-[11px]">data/sql-query</code>
            </div>
          </div>
        </div>

        <div className="relative grid content-center gap-2 px-3.5">
          {steps.map((s, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={s.n}
                className="grid items-center gap-2.5 rounded-[10px] px-3 py-2 transition-colors"
                style={{
                  gridTemplateColumns: "26px 1fr",
                  background: active ? "var(--ol-mint)" : "transparent",
                }}
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[950]"
                  style={
                    active
                      ? { background: "var(--ol-primary)", color: "#fff" }
                      : { background: "#fff", border: "1px solid var(--ol-line)", color: "var(--ol-muted)" }
                  }
                >
                  {s.n}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <b className="text-[13px] font-[900] text-[color:var(--ol-ink)]">{s.title}</b>
                    <span className="ml-2 text-[11.5px] font-bold text-[color:var(--ol-muted)]">{s.detail}</span>
                  </span>
                  <span style={{ color: active ? "var(--ol-primary)" : "var(--ol-subtle)" }}>
                    <Icon name="arrow-up-right" size="sm" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ol-panel" style={{ padding: 18, boxShadow: "none", borderColor: "rgba(15,145,135,0.3)" }}>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[color:var(--ol-primary)] text-white">
              <Icon name="zap" size="lg" />
            </span>
            <div>
              <div className="text-[15px] font-[900] text-[color:var(--ol-ink)]">{copy.currentInstance}</div>
              <div className="text-[12px] font-bold text-[color:var(--ol-muted)]">/api/v1</div>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 text-[11.5px] text-[color:var(--ol-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--ol-primary)]" />
              <span className="font-bold">{copy.running}</span>
            </div>
            <div className="font-mono text-[11px]">{copy.runtimeFlow}</div>
            <div className="font-mono text-[11px]">{copy.runtimeEntries}</div>
          </div>
          <div className="mt-3">
            <div className="ol-kicker" style={{ fontSize: 10 }}>{copy.entries}</div>
            <div className="mt-1.5 grid gap-1 font-mono text-[11px] text-[color:var(--ol-ink)]">
              <span>{copy.userToken}</span>
              <span>{copy.agentToken}</span>
              <span>{copy.webhook}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

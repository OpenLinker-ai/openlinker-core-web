"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

const STEPS: Record<Locale, Array<{ n: string; title: string; detail: string }>> = {
  zh: [
    { n: "1", title: "注册", detail: "创作者声明调用端点、能力和 Skill" },
    { n: "2", title: "登记", detail: "保存后进入 /registry；验证走健康检查和 Benchmark" },
    { n: "3", title: "调用", detail: "用户通过 Web、SDK 或 MCP 触发运行" },
    { n: "4", title: "回写结果", detail: "端点返回输出 JSON" },
    { n: "5", title: "投递", detail: "按投递目标推送到 Slack 或 Webhook" },
  ],
  en: [
    { n: "1", title: "Register", detail: "Creator declares endpoint, capabilities, and Skills" },
    { n: "2", title: "List", detail: "Saved Agents enter /registry; verification uses health and Benchmark evidence" },
    { n: "3", title: "Run", detail: "Users trigger runs through Web, SDK, or MCP" },
    { n: "4", title: "Return result", detail: "Endpoint returns output JSON" },
    { n: "5", title: "Deliver", detail: "Delivery targets send to Slack or Webhook" },
  ],
};

export function ProtocolDiagram({ locale = "zh" }: { locale?: Locale }) {
  const [tick, setTick] = useState(0);
  const steps = STEPS[locale];
  const copy =
    locale === "zh"
      ? {
          yourAgent: "你的 Agent",
          waiting: "已注册 · 等待调用",
          skills: "声明的 Skill",
          running: "运行中",
          runtimeEntries: "SSE / cURL / MCP 三类入口",
          entries: "入口",
        }
      : {
          yourAgent: "Your Agent",
          waiting: "Registered · waiting for runs",
          skills: "Declared Skills",
          running: "Running",
          runtimeEntries: "SSE / cURL / MCP entry points",
          entries: "Entry points",
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
      <div className="ol-kicker">protocol</div>
      <div className="mt-4 grid items-stretch gap-5 xl:grid-cols-[1fr_minmax(320px,1.5fr)_1fr]">
        <div className="ol-panel" style={{ padding: 18, boxShadow: "none", borderColor: "rgba(49,118,237,0.3)" }}>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[color:var(--ol-blue)] text-white">
              <Icon name="bot" size="lg" />
            </span>
            <div>
              <div className="text-[15px] font-[900] text-[color:var(--ol-ink)]">{copy.yourAgent}</div>
              <div className="text-[12px] font-bold text-[color:var(--ol-muted)]">my-agent.example/run</div>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 text-[11.5px] text-[color:var(--ol-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--ol-green)]" />
              <span className="font-bold">{copy.waiting}</span>
            </div>
            <div className="font-mono text-[11px]">endpoint: HTTPS POST</div>
            <div className="font-mono text-[11px]">auth: pre-shared header</div>
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
              <div className="text-[15px] font-[900] text-[color:var(--ol-ink)]">OpenLinker</div>
              <div className="text-[12px] font-bold text-[color:var(--ol-muted)]">/api/v1</div>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 text-[11.5px] text-[color:var(--ol-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--ol-primary)]" />
              <span className="font-bold">{copy.running}</span>
            </div>
            <div className="font-mono text-[11px]">runtime · callback · delivery</div>
            <div className="font-mono text-[11px]">{copy.runtimeEntries}</div>
          </div>
          <div className="mt-3">
            <div className="ol-kicker" style={{ fontSize: 10 }}>{copy.entries}</div>
            <div className="mt-1.5 grid gap-1 font-mono text-[11px] text-[color:var(--ol-ink)]">
              <span>POST /runs</span>
              <span>POST /mcp/run_agent</span>
              <span>POST /runs/:id/deliver</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

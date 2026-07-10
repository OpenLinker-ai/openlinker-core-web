"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ServiceState = "checking" | "operational" | "degraded";
type ProbeState = Record<string, ServiceState>;

type ServiceCopy = Array<{
  id: string;
  name: string;
  signal: string;
  evidence: string;
  detail: string;
  path: string;
}>;

const SERVICE_COPY: Record<Locale, ServiceCopy> = {
  zh: [
    {
      id: "api",
      name: "API 网关",
      signal: "健康检查",
      evidence: "/healthz",
      detail: "异常时，Agent 调用、Agent 列表查询和运行提交可能失败。",
      path: "/healthz",
    },
    {
      id: "database",
      name: "数据库",
      signal: "DB 健康检查",
      evidence: "/healthz/db",
      detail: "异常时，登录、配置读取和运行记录可能不可用。",
      path: "/healthz/db",
    },
    {
      id: "registry",
      name: "Agent 库",
      signal: "公开 API",
      evidence: "/api/v1/agents",
      detail: "异常时，Agent 列表、详情和 Skill 筛选可能无法加载。",
      path: "/api/v1/agents?size=1",
    },
    {
      id: "discovery",
      name: "入口发现",
      signal: "Agent/MCP 发现",
      evidence: "/.well-known/openlinker.json",
      detail: "异常时，客户端可能无法发现 API、MCP 和 A2A 入口。",
      path: "/.well-known/openlinker.json",
    },
  ],
  en: [
    {
      id: "api",
      name: "API Gateway",
      signal: "Health check",
      evidence: "/healthz",
      detail: "Agent calls, Registry queries, and run submission may fail when this is unavailable.",
      path: "/healthz",
    },
    {
      id: "database",
      name: "Database",
      signal: "DB health check",
      evidence: "/healthz/db",
      detail: "Sign-in, configuration reads, and run records may be unavailable when this is down.",
      path: "/healthz/db",
    },
    {
      id: "registry",
      name: "Registry",
      signal: "Public API",
      evidence: "/api/v1/agents",
      detail: "Agent lists, detail pages, and Skill filters may fail to load when this is unavailable.",
      path: "/api/v1/agents?size=1",
    },
    {
      id: "discovery",
      name: "Discovery",
      signal: "Agent/MCP discovery",
      evidence: "/.well-known/openlinker.json",
      detail: "Clients may be unable to discover API, MCP, and A2A entry points when this is unavailable.",
      path: "/.well-known/openlinker.json",
    },
  ],
};

const STATE_LABEL: Record<Locale, Record<ServiceState, string>> = {
  zh: {
    checking: "检测中",
    operational: "正常",
    degraded: "降级",
  },
  en: {
    checking: "Checking",
    operational: "Operational",
    degraded: "Degraded",
  },
};

function initialProbeState(services: ServiceCopy): ProbeState {
  return services.reduce<ProbeState>((acc, service) => {
    acc[service.id] = "checking";
    return acc;
  }, {});
}

export function StatusDashboard({ locale = "zh" }: { locale?: Locale }) {
  const services = useMemo(() => SERVICE_COPY[locale], [locale]);
  const [states, setStates] = useState<ProbeState>(() => initialProbeState(services));
  const copy =
    locale === "zh"
        ? {
          kicker: "实例状态",
          checkingTitle: "正在检测服务状态",
          operationalTitle: "全部服务正常",
          degradedTitle: "部分服务降级",
          signal: "信号",
          evidence: "依据",
          incidents: "事件记录",
          incidentMeta: "来自当前实例的实时公开探针",
          checkingPublic: "正在检测公开服务",
          noIncident: "暂无公开异常",
          incidentBody: "状态来自浏览器可访问的公开探针，不代表实例内部服务、目标 Agent 或第三方投递渠道的完整状态。",
          probeFailed: "探针失败",
          needsAction: "功能受影响",
          failedBody: "当前不可用，相关页面或调用可能失败。请稍后重试；若持续异常，请联系当前实例运营方。",
          currentEvent: "当前影响",
          currentReading: "正在读取公开探针",
          currentOperational: "公开服务探针正常",
          currentDegraded: "存在公开探针异常",
          operationalBody: "登录、Agent 发现与运行所需的公开入口当前均可访问。",
          degradedBody: "部分页面、Agent 发现或调用可能暂时不可用。请稍后重试；若持续异常，请联系当前实例运营方。",
          related: "相关页面",
          connect: "开发者文档",
          inbox: "通知中心",
          usage: "运行历史",
        }
      : {
          kicker: "Instance status",
          checkingTitle: "Checking service status",
          operationalTitle: "All services operational",
          degradedTitle: "Some services degraded",
          signal: "Signal",
          evidence: "Evidence",
          incidents: "Incident record",
          incidentMeta: "Live public probes from this instance",
          checkingPublic: "Checking public services",
          noIncident: "No public incident",
          incidentBody: "Status comes from browser-accessible public probes and does not represent every internal service, target Agent, or third-party delivery channel.",
          probeFailed: "probe failed",
          needsAction: "Features affected",
          failedBody: "is unavailable, so related pages or calls may fail. Try again later; contact the current instance operator if the issue continues.",
          currentEvent: "Current impact",
          currentReading: "Reading public probes",
          currentOperational: "Public probes are healthy",
          currentDegraded: "Some public probes failed",
          operationalBody: "The public entry points required for sign-in, Agent discovery, and runs are currently reachable.",
          degradedBody: "Some pages, Agent discovery, or run calls may be temporarily unavailable. Try again later; contact the current instance operator if the issue continues.",
          related: "Related pages",
          connect: "Developer docs",
          inbox: "Inbox",
          usage: "Run history",
        };

  useEffect(() => {
    let canceled = false;

    async function probe() {
      const results = await Promise.all(
        services.map(async (service) => {
          try {
            const response = await fetch(service.path, { cache: "no-store" });
            return [service.id, response.ok ? "operational" : "degraded"] as const;
          } catch {
            return [service.id, "degraded"] as const;
          }
        }),
      );
      if (!canceled) {
        setStates(Object.fromEntries(results) as ProbeState);
      }
    }

    void probe();
    return () => {
      canceled = true;
    };
  }, [services]);

  const degradedServices = useMemo(
    () => services.filter((service) => states[service.id] === "degraded"),
    [services, states],
  );
  const hasChecking = services.some(
    (service) => states[service.id] === "checking",
  );
  const allOperational = degradedServices.length === 0 && !hasChecking;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <section className="space-y-6">
        <div className="ol-panel ol-panel-pad">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="ol-kicker">{copy.kicker}</div>
              <h2 className="mt-2 text-[24px] font-black text-[color:var(--ol-ink)]">
                {hasChecking
                  ? copy.checkingTitle
                  : allOperational
                  ? copy.operationalTitle
                  : copy.degradedTitle}
              </h2>
            </div>
            <span
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-[13px] font-black",
                hasChecking
                  ? "bg-[color:var(--ol-soft)] text-[color:var(--ol-muted)]"
                  : allOperational
                  ? "bg-[color:var(--ol-green-soft)] text-[color:var(--ol-green)]"
                  : "bg-[color:var(--ol-amber-soft)] text-[color:var(--ol-amber)]",
              )}
            >
              <Icon
                name={hasChecking ? "refresh" : allOperational ? "check" : "warn"}
                size="sm"
              />
              {hasChecking
                ? STATE_LABEL[locale].checking
                : allOperational
                ? STATE_LABEL[locale].operational
                : STATE_LABEL[locale].degraded}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {services.map((service) => {
              const state = states[service.id] ?? "checking";
              return (
                <article
                  key={service.name}
                  className="rounded-[16px] border border-[color:var(--ol-line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[13px] font-black text-[color:var(--ol-ink)]">
                      {service.name}
                    </h3>
                    <span
                      className={cn(
                        "ol-chip",
                        state === "degraded"
                          ? "ol-chip-amber"
                          : state === "checking"
                          ? "ol-chip-blue"
                          : "ol-chip-green",
                      )}
                    >
                      {STATE_LABEL[locale][state]}
                    </span>
                  </div>
                  <p className="mt-2 min-h-[48px] text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                    {service.detail}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="block font-bold text-[color:var(--ol-subtle)]">
                        {copy.signal}
                      </span>
                      <strong className="text-[color:var(--ol-ink)]">
                        {service.signal}
                      </strong>
                    </div>
                    <div>
                      <span className="block font-bold text-[color:var(--ol-subtle)]">
                        {copy.evidence}
                      </span>
                      <strong className="text-[color:var(--ol-ink)]">
                        {service.evidence}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="ol-panel overflow-hidden">
          <div className="ol-panel-head">
            <strong>{copy.incidents}</strong>
            <span className="text-[12.5px] font-black text-[color:var(--ol-muted)]">
              {copy.incidentMeta}
            </span>
          </div>
          <div className="grid gap-0">
            {degradedServices.length === 0 ? (
              <div className="p-4">
                <div className="text-[14px] font-black text-[color:var(--ol-ink)]">
                  {hasChecking ? copy.checkingPublic : copy.noIncident}
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                  {copy.incidentBody}
                </p>
              </div>
            ) : (
              degradedServices.map((service) => (
                <div
                  key={service.id}
                  className="border-b border-[color:var(--ol-line)] bg-white p-4 text-left last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-black text-[color:var(--ol-ink)]">
                      {service.name} {copy.probeFailed}
                    </span>
                    <span className="ol-chip ol-chip-amber">{copy.needsAction}</span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                    {locale === "zh"
                      ? `${service.evidence} ${copy.failedBody}`
                      : `${service.evidence} ${copy.failedBody}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.currentEvent}
          </h2>
          <div
            className={cn(
              "mt-4 rounded-[16px] p-4",
              allOperational
                ? "bg-[color:var(--ol-green-soft)]"
                : hasChecking
                ? "bg-[color:var(--ol-soft)]"
                : "bg-[color:var(--ol-amber-soft)]",
            )}
          >
            <div
              className={cn(
                "text-[13px] font-black",
                allOperational
                  ? "text-[color:var(--ol-green)]"
                  : hasChecking
                  ? "text-[color:var(--ol-muted)]"
                  : "text-[color:var(--ol-amber)]",
              )}
            >
              {hasChecking
                ? STATE_LABEL[locale].checking
                : allOperational
                ? STATE_LABEL[locale].operational
                : copy.needsAction}
            </div>
            <h3 className="mt-2 text-[15px] font-black text-[color:var(--ol-ink)]">
              {hasChecking
                ? copy.currentReading
                : allOperational
                ? copy.currentOperational
                : copy.currentDegraded}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
              {allOperational ? copy.operationalBody : copy.degradedBody}
            </p>
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.related}
          </h2>
          <div className="mt-4 grid gap-2">
            <Link className="ol-filter-item active" href="/connect">
              {copy.connect} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/inbox">
              {copy.inbox} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/run">
              {copy.usage} <span>→</span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

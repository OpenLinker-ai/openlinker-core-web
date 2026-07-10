"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { API_BASE_URL, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type CheckState = "idle" | "running" | "pass" | "fail";

type CheckItem = {
  id: string;
  label: string;
  detail: string;
  state: CheckState;
};

type HTTPResult = {
  res: Response;
  json: unknown;
  text: string;
};

type SSESnapshot = {
  text: string;
  eventIds: number[];
  lastEventId: number;
  heartbeatCount: number;
};

const CHECK_IDS = [
  "public-card",
  "extended-card",
  "jsonrpc-extended-card",
  "jsonrpc-send",
  "task-get",
  "jsonrpc-list-tasks",
  "http-list-tasks",
  "push-config",
  "stream",
  "long-online",
] as const;

export function A2AConformancePanel({
  locale,
  initialSlug = "",
}: {
  locale: Locale;
  initialSlug?: string;
}) {
  const { token, isAuthenticated } = useApi();
  const [slug, setSlug] = useState(initialSlug);
  const [sample, setSample] = useState(
    locale === "zh" ? "A2A 页面流式校验，请返回一条简短确认。" : "A2A page stream check. Please return a short confirmation.",
  );
  const [checks, setChecks] = useState<CheckItem[]>(() => createChecks(locale));
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = useMemo(
    () =>
      locale === "zh"
        ? {
            title: "A2A 标准校验",
            badge: "HTTPS + JSON-RPC + SSE",
            slug: "Agent 标识（slug）",
            sample: "流式实测输入",
            light: "标准自检",
            stream: "流式实测",
            long: "长在线验证",
            login: "需要登录后读取扩展卡与 A2A Task 列表。",
            pass: "通过",
            fail: "失败",
            idle: "待测",
            running: "校验中",
            ready: "选择一个公开 Agent 标识后运行标准自检。",
          }
        : {
            title: "A2A Conformance",
            badge: "HTTPS + JSON-RPC + SSE",
            slug: "Agent slug",
            sample: "Streaming test input",
            light: "Standard check",
            stream: "Stream test",
            long: "Long-online test",
            login: "Sign in to read the extended card and task list.",
            pass: "Pass",
            fail: "Fail",
            idle: "Idle",
            running: "Checking",
            ready: "Choose a public Agent slug and run the standard checks.",
          },
    [locale],
  );

  const setCheck = (id: string, patch: Partial<CheckItem>) => {
    setChecks((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  async function runLightChecks() {
    const cleanSlug = slug.trim();
    setSummary("");
    setChecks(createChecks(locale));
    if (!cleanSlug) {
      setSummary(copy.ready);
      return;
    }
    if (!isAuthenticated || !token) {
      setSummary(copy.login);
      return;
    }
    setBusy(true);
    try {
      await checkPublicCard(cleanSlug, setCheck);
      await checkExtendedCard(cleanSlug, token, setCheck);
      await checkJSONRPCExtendedCard(cleanSlug, token, setCheck);
      const run = await checkJSONRPCSend(cleanSlug, token, sample, setCheck);
      await checkTaskGet(cleanSlug, token, run.taskId, setCheck);
      await checkJSONRPCListTasks(cleanSlug, token, setCheck, run.contextId);
      await checkHTTPListTasks(cleanSlug, token, setCheck, run.contextId);
      await checkPushConfig(cleanSlug, token, run.taskId, setCheck);
      setSummary(locale === "zh" ? "A2A 标准面校验完成。" : "A2A standard checks completed.");
    } catch (err) {
      const message = localizedCheckError(err, locale, copy.fail);
      setChecks((items) => items.map((item) => (item.state === "running" ? { ...item, state: "fail", detail: message } : item)));
      setSummary(message);
    } finally {
      setBusy(false);
    }
  }

  async function runStreamCheck() {
    const cleanSlug = slug.trim();
    if (!cleanSlug) {
      setSummary(copy.ready);
      return;
    }
    if (!isAuthenticated || !token) {
      setSummary(copy.login);
      return;
    }
    setBusy(true);
    try {
      await checkStream(cleanSlug, token, sample, setCheck);
      setSummary(locale === "zh" ? "SSE 流式通道已返回标准事件。" : "SSE stream returned standard events.");
    } catch (err) {
      const message = localizedCheckError(err, locale, copy.fail);
      setCheck("stream", { state: "fail", detail: message });
      setSummary(message);
    } finally {
      setBusy(false);
    }
  }

  async function runLongOnlineCheck() {
    const cleanSlug = slug.trim();
    if (!cleanSlug) {
      setSummary(copy.ready);
      return;
    }
    if (!isAuthenticated || !token) {
      setSummary(copy.login);
      return;
    }
    setBusy(true);
    try {
      await checkLongOnline(cleanSlug, token, sample, setCheck);
      setSummary(locale === "zh" ? "A2A 长在线、断线续传与终态收敛通过。" : "A2A long-online, resume, and terminal convergence passed.");
    } catch (err) {
      const message = localizedCheckError(err, locale, copy.fail);
      setCheck("long-online", { state: "fail", detail: message });
      setSummary(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="ol-chip ol-chip-blue">{copy.badge}</span>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">{copy.slug}</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="mt-1 w-full rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-[color:var(--ol-primary)]"
              placeholder="my-agent-slug"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">{copy.sample}</span>
            <textarea
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[13px] leading-5 outline-none focus:border-[color:var(--ol-primary)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ol-btn" onClick={runLightChecks} disabled={busy}>
              <Icon name="check" size="sm" /> {copy.light}
            </button>
            <button type="button" className="ol-mini-btn" onClick={runStreamCheck} disabled={busy}>
              <Icon name="refresh" size="sm" /> {copy.stream}
            </button>
            <button type="button" className="ol-mini-btn" onClick={runLongOnlineCheck} disabled={busy}>
              <Icon name="zap" size="sm" /> {copy.long}
            </button>
          </div>
          {summary ? (
            <p className="rounded-[8px] bg-[color:var(--ol-soft)] px-3 py-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
              {summary}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          {checks.map((item) => (
            <div key={item.id} className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-black text-[color:var(--ol-ink)]">{item.label}</span>
                <span className={stateClass(item.state)}>
                  {item.state === "pass"
                    ? copy.pass
                    : item.state === "fail"
                      ? copy.fail
                      : item.state === "running"
                        ? copy.running
                        : copy.idle}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] font-semibold leading-4 text-[color:var(--ol-muted)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function createChecks(locale: Locale): CheckItem[] {
  const labels =
    locale === "zh"
      ? {
          public: "公开 Agent Card",
          extended: "扩展 Agent Card",
          rpcCard: "JSON-RPC 扩展卡",
          rpcSend: "JSON-RPC SendMessage",
          taskGet: "GetTask",
          rpcList: "JSON-RPC ListTasks",
          httpList: "HTTP+JSON ListTasks",
          push: "Push Config",
          stream: "SSE message:stream",
          long: "长在线 + 续传",
          pending: "等待运行",
        }
      : {
          public: "Public Agent Card",
          extended: "Extended Agent Card",
          rpcCard: "JSON-RPC extended card",
          rpcSend: "JSON-RPC SendMessage",
          taskGet: "GetTask",
          rpcList: "JSON-RPC ListTasks",
          httpList: "HTTP+JSON ListTasks",
          push: "Push Config",
          stream: "SSE message:stream",
          long: "Long-online + resume",
          pending: "Waiting to run",
        };
  return [
    { id: CHECK_IDS[0], label: labels.public, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[1], label: labels.extended, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[2], label: labels.rpcCard, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[3], label: labels.rpcSend, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[4], label: labels.taskGet, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[5], label: labels.rpcList, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[6], label: labels.httpList, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[7], label: labels.push, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[8], label: labels.stream, detail: labels.pending, state: "idle" },
    { id: CHECK_IDS[9], label: labels.long, detail: labels.pending, state: "idle" },
  ];
}

function localizedCheckError(err: unknown, locale: Locale, fallback: string): string {
  return localizedErrorMessage(err instanceof Error ? err : new Error(String(err)), locale, fallback);
}

async function checkPublicCard(slug: string, setCheck: (id: string, patch: Partial<CheckItem>) => void) {
  setCheck("public-card", { state: "running", detail: "GET /.well-known/agent-card.json" });
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}/.well-known/agent-card.json`, "GET");
  const card = asRecord(json);
  const interfaces = asArray(card.supportedInterfaces);
  assertEqual(card.protocolVersion, "1.0", "protocolVersion must be 1.0");
  assertEqual(card.preferredTransport, "JSONRPC", "preferredTransport must be JSONRPC");
  const additionalInterfaces = asArray(card.additionalInterfaces);
  assertSomeTransport(additionalInterfaces, "JSONRPC");
  assertSomeTransport(additionalInterfaces, "HTTP+JSON");
  assertEqual(card.supportsAuthenticatedExtendedCard, true, "supportsAuthenticatedExtendedCard must be true");
  assertSomeInterface(interfaces, "JSONRPC", "1.0");
  assertSomeInterface(interfaces, "HTTP+JSON", "1.0");
  const caps = asRecord(card.capabilities);
  assertEqual(caps.streaming, true, "streaming capability must be true");
  assertEqual(caps.pushNotifications, true, "pushNotifications capability must be true");
  assertEqual(caps.extendedAgentCard, true, "extendedAgentCard capability must be true");
  if (!card.securitySchemes || !card.security) {
    throw new Error("Agent Card must include securitySchemes and security");
  }
  const bearer = asRecord(asRecord(card.securitySchemes).openlinker_bearer);
  assertEqual(bearer.type, "http", "securitySchemes.openlinker_bearer.type must be http");
  assertEqual(bearer.scheme, "bearer", "securitySchemes.openlinker_bearer.scheme must be bearer");
  setCheck("public-card", { state: "pass", detail: "JSONRPC/HTTP+JSON 1.0, streaming, push, security" });
}

async function checkExtendedCard(slug: string, token: string, setCheck: (id: string, patch: Partial<CheckItem>) => void) {
  setCheck("extended-card", { state: "running", detail: "GET /extendedAgentCard" });
  const { res, json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}/extendedAgentCard`, "GET", undefined, token, {
    "A2A-Version": "1.0",
  });
  assertEqual(res.headers.get("a2a-version"), "1.0", "A2A-Version response header must be 1.0");
  const card = asRecord(json);
  assertEqual(asRecord(card.openlinker).card_variant, "extended", "extended card variant required");
  setCheck("extended-card", { state: "pass", detail: "authenticated extended card returned" });
}

async function checkJSONRPCExtendedCard(slug: string, token: string, setCheck: (id: string, patch: Partial<CheckItem>) => void) {
  setCheck("jsonrpc-extended-card", { state: "running", detail: "POST GetExtendedAgentCard" });
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
    jsonrpc: "2.0",
    id: "page-extended-card",
    method: "GetExtendedAgentCard",
  }, token, { "A2A-Version": "1.0" });
  const body = asRecord(json);
  assertNoRPCError(body);
  assertEqual(asRecord(asRecord(body.result).openlinker).card_variant, "extended", "extended card variant required");
  setCheck("jsonrpc-extended-card", { state: "pass", detail: "JSON-RPC method returned Agent Card" });
}

async function checkJSONRPCSend(
  slug: string,
  token: string,
  sample: string,
  setCheck: (id: string, patch: Partial<CheckItem>) => void,
): Promise<{ taskId: string; contextId: string }> {
  const contextId = `page-a2a-${Date.now()}`;
  setCheck("jsonrpc-send", { state: "running", detail: "POST SendMessage" });
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
    jsonrpc: "2.0",
    id: "page-send-message",
    method: "SendMessage",
    params: {
        message: {
          messageId: `page-message-${Date.now()}`,
          contextId,
          role: "ROLE_USER",
          parts: [{ text: sample.trim() || "A2A standard check" }],
        },
      configuration: { acceptedOutputModes: ["application/json", "text/plain"], returnImmediately: false },
      metadata: { client: "openlinker-a2a-conformance" },
    },
  }, token, { "A2A-Version": "1.0" });
  const body = asRecord(json);
  assertNoRPCError(body);
  const result = asRecord(asRecord(body.result).task);
  const taskId = String(result.id ?? "");
  if (!taskId) throw new Error("SendMessage result must include task id");
  assertTaskState(asRecord(result.status).state);
  setCheck("jsonrpc-send", { state: "pass", detail: `task ${shortID(taskId)} created` });
  return { taskId, contextId };
}

async function checkTaskGet(slug: string, token: string, taskId: string, setCheck: (id: string, patch: Partial<CheckItem>) => void) {
  setCheck("task-get", { state: "running", detail: "POST GetTask historyLength=1" });
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
    jsonrpc: "2.0",
    id: "page-get-task",
    method: "GetTask",
    params: { id: taskId, historyLength: 1 },
  }, token, { "A2A-Version": "1.0" });
  const body = asRecord(json);
  assertNoRPCError(body);
  const result = asRecord(body.result);
  assertEqual(result.id, taskId, "GetTask must return the requested task");
  assertTaskState(asRecord(result.status).state);
  setCheck("task-get", { state: "pass", detail: `task ${shortID(taskId)} readable` });
}

async function checkJSONRPCListTasks(
  slug: string,
  token: string,
  setCheck: (id: string, patch: Partial<CheckItem>) => void,
  contextId?: string,
) {
  setCheck("jsonrpc-list-tasks", { state: "running", detail: "POST ListTasks pageSize=5" });
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
    jsonrpc: "2.0",
    id: "page-list-tasks",
    method: "ListTasks",
    params: { pageSize: 5, includeArtifacts: false, ...(contextId ? { contextId } : {}) },
  }, token, { "A2A-Version": "1.0" });
  const body = asRecord(json);
  assertNoRPCError(body);
  assertTaskList(asRecord(body.result));
  setCheck("jsonrpc-list-tasks", { state: "pass", detail: "tasks, nextPageToken, pageSize, totalSize" });
}

async function checkHTTPListTasks(
  slug: string,
  token: string,
  setCheck: (id: string, patch: Partial<CheckItem>) => void,
  contextId?: string,
) {
  setCheck("http-list-tasks", { state: "running", detail: "GET /tasks?pageSize=5" });
  const suffix = contextId ? `&contextId=${encodeURIComponent(contextId)}` : "";
  const { res, json } = await requestJSON(
    `/api/v1/a2a/agents/${encodeURIComponent(slug)}/tasks?pageSize=5&includeArtifacts=false${suffix}`,
    "GET",
    undefined,
    token,
    { "A2A-Version": "1.0" },
  );
  assertEqual(res.headers.get("a2a-version"), "1.0", "A2A-Version response header must be 1.0");
  assertTaskList(asRecord(json));
  setCheck("http-list-tasks", { state: "pass", detail: "HTTP+JSON list endpoint returned required fields" });
}

async function checkPushConfig(slug: string, token: string, taskId: string, setCheck: (id: string, patch: Partial<CheckItem>) => void) {
  setCheck("push-config", { state: "running", detail: "set/list/get/delete pushNotificationConfigs" });
  const basePath = `/api/v1/a2a/agents/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs`;
  const setResult = await requestJSON(basePath, "POST", {
    url: "https://example.com/openlinker-a2a-conformance-webhook",
    eventTypes: ["run.completed"],
    metadata: { client: "openlinker-a2a-conformance" },
  }, token, { "A2A-Version": "1.0" });
  const created = asRecord(setResult.json);
  const configId = String(created.id ?? "");
  if (!configId) throw new Error("Push config response must include id");
  const listed = await requestJSON(basePath, "GET", undefined, token, { "A2A-Version": "1.0" });
  if (!asArray(asRecord(listed.json).configs).some((item) => asRecord(item).id === configId)) {
    throw new Error("List push configs must include the created config");
  }
  const got = await requestJSON(`${basePath}/${encodeURIComponent(configId)}`, "GET", undefined, token, { "A2A-Version": "1.0" });
  assertEqual(asRecord(got.json).id, configId, "Get push config must return created id");
  const deleted = await fetch(`${API_BASE_URL}${basePath}/${encodeURIComponent(configId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "A2A-Version": "1.0" },
  });
  if (deleted.status !== 204) throw new Error(`Delete push config -> HTTP ${deleted.status}`);
  setCheck("push-config", { state: "pass", detail: `config ${shortID(configId)} created and deleted` });
}

async function checkStream(
  slug: string,
  token: string,
  sample: string,
  setCheck: (id: string, patch: Partial<CheckItem>) => void,
) {
  setCheck("stream", { state: "running", detail: "POST /message:stream" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/a2a/agents/${encodeURIComponent(slug)}/message:stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        message: {
          messageId: `page-stream-${Date.now()}`,
          role: "ROLE_USER",
          parts: [{ text: sample.trim() || "A2A stream check" }],
        },
        configuration: { acceptedOutputModes: ["application/json", "text/plain"] },
        metadata: { client: "openlinker-a2a-conformance" },
      }),
      signal: controller.signal,
    });
    const text = await readStreamText(res);
    if (!res.ok) throw new Error(`SSE HTTP ${res.status}: ${text}`);
    if (!/text\/event-stream/i.test(res.headers.get("content-type") ?? "")) {
      throw new Error("SSE response must be text/event-stream");
    }
    if (text.includes("task.stream.error")) {
      throw new Error(text.slice(0, 240));
    }
    if (!/event: (task|status-update|artifact-update|message)/.test(text)) {
      throw new Error("SSE stream did not include A2A events");
    }
    setCheck("stream", { state: "pass", detail: "text/event-stream with A2A events" });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkLongOnline(
  slug: string,
  token: string,
  sample: string,
  setCheck: (id: string, patch: Partial<CheckItem>) => void,
) {
  let taskId = "";
  let canceled = false;
  setCheck("long-online", { state: "running", detail: "POST SendMessage returnImmediately=true" });
  try {
    const start = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
      jsonrpc: "2.0",
      id: "page-long-online-start",
      method: "SendMessage",
      params: {
        message: {
          messageId: `page-long-online-${Date.now()}`,
          contextId: `page-long-online-${Date.now()}`,
          role: "ROLE_USER",
          parts: [{ text: sample.trim() || "A2A long-online check" }],
        },
        configuration: { acceptedOutputModes: ["application/json", "text/plain"], returnImmediately: true },
        metadata: { client: "openlinker-a2a-long-online" },
      },
    }, token, { "A2A-Version": "1.0" });
    const body = asRecord(start.json);
    assertNoRPCError(body);
    const task = asRecord(asRecord(body.result).task);
    taskId = String(task.id ?? "");
    if (!taskId) throw new Error("SendMessage result must include task id");
    const state = String(asRecord(task.status).state ?? "");
    assertTaskState(state);
    if (state !== "TASK_STATE_WORKING") {
      throw new Error("Long-online check requires a running runtime_pull or long task");
    }

    setCheck("long-online", { state: "running", detail: `subscribe ${shortID(taskId)} until heartbeat` });
    const first = await readTaskSubscription(slug, taskId, token, {
      timeoutMs: 20000,
      stopWhen: (snapshot) => snapshot.heartbeatCount > 0 && snapshot.lastEventId > 0,
      timeoutMessage: "SSE did not stay online until heartbeat",
    });
    if (first.heartbeatCount < 1) throw new Error("SSE heartbeat was not observed");
    if (first.lastEventId <= 0) throw new Error("SSE stream did not expose resumable event id");

    setCheck("long-online", { state: "running", detail: `resume from Last-Event-ID ${first.lastEventId}` });
    const resumedPromise = readTaskSubscription(slug, taskId, token, {
      lastEventId: first.lastEventId,
      timeoutMs: 14000,
      stopWhen: (snapshot) => /TASK_STATE_CANCELED|canceled/i.test(snapshot.text),
      timeoutMessage: "resumed SSE did not receive terminal cancel event",
    });
    await sleep(500);
    await cancelA2ATask(slug, taskId, token);
    canceled = true;
    const resumed = await resumedPromise;
    if (!/TASK_STATE_CANCELED|canceled/i.test(resumed.text)) {
      throw new Error("resumed SSE did not converge to TASK_STATE_CANCELED");
    }
    if (resumed.eventIds.length === 0) {
      throw new Error("resumed SSE did not include a new event id");
    }
    if (resumed.eventIds.some((id) => id <= first.lastEventId)) {
      throw new Error("Last-Event-ID resume replayed already-consumed events");
    }
    setCheck("long-online", {
      state: "pass",
      detail: `heartbeat x${first.heartbeatCount}, resumed ${resumed.eventIds.length} event(s)`,
    });
  } finally {
    if (taskId && !canceled) {
      await cancelA2ATask(slug, taskId, token).catch(() => undefined);
    }
  }
}

async function requestJSON(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  token?: string,
  extraHeaders: Record<string, string> = {},
): Promise<HTTPResult> {
  const headers = new Headers(extraHeaders);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return { res, json, text };
}

async function readStreamText(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (let i = 0; i < 80; i += 1) {
    const { done, value } = await reader.read();
    if (value) text += decoder.decode(value, { stream: true });
    if (
      done ||
      text.includes("TASK_STATE_COMPLETED") ||
      text.includes("completed") ||
      text.includes("task.stream.error") ||
      text.includes("status-update")
    ) {
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  return text + decoder.decode();
}

async function readTaskSubscription(
  slug: string,
  taskId: string,
  token: string,
  options: {
    lastEventId?: number;
    timeoutMs: number;
    timeoutMessage: string;
    stopWhen: (snapshot: SSESnapshot) => boolean;
  },
): Promise<SSESnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      "A2A-Version": "1.0",
    };
    if (options.lastEventId && options.lastEventId > 0) {
      headers["Last-Event-ID"] = String(options.lastEventId);
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/a2a/agents/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}:subscribe`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`SubscribeTask -> HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`);
    }
    if (!/text\/event-stream/i.test(res.headers.get("content-type") ?? "")) {
      throw new Error("SubscribeTask response must be text/event-stream");
    }
    if (!res.body) throw new Error("SubscribeTask response body is empty");

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (let i = 0; i < 200; i += 1) {
      const { done, value } = await reader.read();
      if (value) text += decoder.decode(value, { stream: true });
      const snapshot = sseSnapshot(text);
      if (options.stopWhen(snapshot)) {
        await reader.cancel().catch(() => undefined);
        return snapshot;
      }
      if (done) break;
    }
    text += decoder.decode();
    const snapshot = sseSnapshot(text);
    if (options.stopWhen(snapshot)) return snapshot;
    throw new Error(options.timeoutMessage);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(options.timeoutMessage);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    await reader?.cancel().catch(() => undefined);
  }
}

async function cancelA2ATask(slug: string, taskId: string, token: string) {
  const { json } = await requestJSON(`/api/v1/a2a/agents/${encodeURIComponent(slug)}`, "POST", {
    jsonrpc: "2.0",
    id: `page-long-online-cancel-${Date.now()}`,
    method: "CancelTask",
    params: { id: taskId },
  }, token, { "A2A-Version": "1.0" });
  assertNoRPCError(asRecord(json));
}

function sseSnapshot(text: string): SSESnapshot {
  const eventIds = Array.from(text.matchAll(/^id: ([0-9]+)$/gm), (match) => Number(match[1])).filter(Number.isFinite);
  return {
    text,
    eventIds,
    lastEventId: eventIds.length > 0 ? eventIds[eventIds.length - 1] : 0,
    heartbeatCount: text.match(/^: heartbeat$/gm)?.length ?? 0,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertTaskList(value: Record<string, unknown>) {
  if (!Array.isArray(value.tasks)) throw new Error("ListTasks response must include tasks array");
  if (typeof value.nextPageToken !== "string") throw new Error("ListTasks response must include nextPageToken string");
  if (typeof value.pageSize !== "number") throw new Error("ListTasks response must include pageSize number");
  if (typeof value.totalSize !== "number") throw new Error("ListTasks response must include totalSize number");
}

function assertTaskState(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("TASK_STATE_")) {
    throw new Error("A2A 1.0 task status must use TASK_STATE_* enum");
  }
}

function assertSomeInterface(items: unknown[], binding: string, version: string) {
  const ok = items.some((item) => {
    const row = asRecord(item);
    return row.protocolBinding === binding && row.protocolVersion === version;
  });
  if (!ok) throw new Error(`Agent Card missing ${binding}/${version}`);
}

function assertSomeTransport(items: unknown[], transport: string) {
  const ok = items.some((item) => asRecord(item).transport === transport);
  if (!ok) throw new Error(`Agent Card missing ${transport} transport`);
}

function assertNoRPCError(body: Record<string, unknown>) {
  if (body.error) throw new Error(JSON.stringify(body.error).slice(0, 240));
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function shortID(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function stateClass(state: CheckState): string {
  switch (state) {
    case "pass":
      return "ol-chip ol-chip-mint";
    case "fail":
      return "ol-chip ol-chip-amber";
    case "running":
      return "ol-chip ol-chip-blue";
    default:
      return "ol-chip";
  }
}

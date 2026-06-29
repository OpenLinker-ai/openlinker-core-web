"use client";

/**
 * API 调用示例片段：cURL / Python / Node.js 三 tab 切换 + 一键复制。
 *
 * agentID 直接拼到 snippet 里。endpoint_url 不在这里展示——通过统一网关
 * /api/v1/runs 异步启动，鉴权 token 也在网关层处理。
 *
 * 复制依赖 navigator.clipboard，仅在 https / localhost 可用；
 * 失败时给降级 toast。
 */

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { getApiBaseUrl } from "@/lib/api-root";
import type { Locale } from "@/lib/i18n";

type Tab = "curl" | "python" | "node";

const TABS: { id: Tab; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "node", label: "Node.js" },
];

export function ApiSnippet({
  agentID,
  sampleInput,
  apiBaseUrl,
  locale = "zh",
}: {
  agentID: string;
  slug: string;
  sampleInput?: Record<string, unknown>;
  apiBaseUrl?: string;
  locale?: Locale;
}) {
  const [tab, setTab] = useState<Tab>("curl");
  const copy =
    locale === "zh"
      ? {
          copied: "已复制到剪贴板",
          copyFailed: "复制失败，请手动选中代码",
          copyCode: "复制代码",
          hint: (
            <>
              提示：YOUR_TOKEN 是访问令牌，可在{" "}
              <Link
                href="/connect"
                className="font-bold text-[color:var(--ol-primary-dark)] underline-offset-2 hover:underline"
              >
                接入中心
              </Link>{" "}
              查看创建说明，异步调用返回 run_id 后可用 SSE 追踪进度。
            </>
          ),
        }
      : {
          copied: "Copied to clipboard",
          copyFailed: "Copy failed. Select the code manually.",
          copyCode: "Copy code",
          hint: (
            <>
              Tip: YOUR_TOKEN is an access token. See{" "}
              <Link
                href="/connect"
                className="font-bold text-[color:var(--ol-primary-dark)] underline-offset-2 hover:underline"
              >
                Connect Center
              </Link>{" "}
              for setup instructions. After the async call returns a run_id, use SSE to track progress.
            </>
          ),
        };

  const apiURL = apiBaseUrl ?? getApiBaseUrl();
  const requestBody = {
    agent_id: agentID,
    input: sampleInput ?? { your_field: "your_value" },
  };
  const requestBodyJSON = JSON.stringify(requestBody, null, 2);
  const requestBodyStringLiteral = JSON.stringify(requestBodyJSON);

  const snippets: Record<Tab, string> = {
    curl: `OPENLINKER_API_KEY=your_access_token
AUTH_HEADER="Authorization: Bearer $OPENLINKER_API_KEY"

curl -X POST ${apiURL}/api/v1/runs \\
  -H "$AUTH_HEADER" \\
  -H "Content-Type: application/json" \\
  -d '${requestBodyJSON}'

# 响应会返回 {"run_id":"...","status":"running"}
curl -N ${apiURL}/api/v1/runs/RUN_ID/stream \\
  -H "$AUTH_HEADER" \\
  -H "Accept: text/event-stream"`,
    python: `import json
import requests

body = json.loads(${requestBodyStringLiteral})

run = requests.post(
    "${apiURL}/api/v1/runs",
    headers={"Authorization": "Bearer YOUR_TOKEN"},
    json=body,
).json()
print(run)

with requests.get(
    f"${apiURL}/api/v1/runs/{run['run_id']}/stream",
    headers={
        "Authorization": "Bearer YOUR_TOKEN",
        "Accept": "text/event-stream",
    },
    stream=True,
) as events:
    for line in events.iter_lines(decode_unicode=True):
        if line:
            print(line)`,
    node: `const res = await fetch("${apiURL}/api/v1/runs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${requestBodyJSON}),
});
const run = await res.json();
console.log(run);

const stream = await fetch(
  "${apiURL}/api/v1/runs/" + encodeURIComponent(run.run_id) + "/stream",
  {
    headers: {
      "Authorization": "Bearer YOUR_TOKEN",
      "Accept": "text/event-stream",
    },
  },
);
for await (const chunk of stream.body) {
  process.stdout.write(Buffer.from(chunk).toString("utf8"));
}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippets[tab]);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1 text-[11.5px] font-bold transition-colors ${
              tab === id
                ? "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
                : "bg-transparent text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <pre className="max-h-48 overflow-auto rounded-xl bg-[#0f1c2c] p-3 text-[11px] leading-relaxed text-[#cfe6e2]">
          <code>{snippets[tab]}</code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/20"
        >
          {copy.copyCode}
        </button>
      </div>

      <p className="text-[11.5px] text-[color:var(--ol-muted)]">
        {copy.hint}
      </p>
    </div>
  );
}

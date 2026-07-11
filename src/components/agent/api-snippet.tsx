"use client";

/**
 * API 调用示例片段：cURL / TypeScript SDK / Go SDK 三 tab 切换 + 一键复制。
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

type Tab = "curl" | "typescript" | "go";

const TABS: Tab[] = ["curl", "typescript", "go"];

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
          tabLabels: { curl: "cURL", typescript: "TypeScript SDK 示例", go: "Go SDK 示例" },
          responseComment: "响应会返回 {\"run_id\":\"...\",\"status\":\"running\"}",
          newIntentComment: "每次新的运行意图只生成一次 key；同一意图的网络重试继续复用它。",
          hint: (
            <>
              提示：YOUR_TOKEN 是 User Token。前往{" "}
              <Link
                href="/settings/user-tokens"
                className="font-bold text-[color:var(--ol-primary-dark)] underline-offset-2 hover:underline"
              >
                User Token 设置
              </Link>{" "}
              查看本地签发的当前实现状态。一次新的运行意图必须使用新的幂等键；请求超时或断线后重试时，保持键和请求内容不变。
            </>
          ),
        }
      : {
          copied: "Copied to clipboard",
          copyFailed: "Copy failed. Select the code manually.",
          copyCode: "Copy code",
          tabLabels: { curl: "cURL", typescript: "TypeScript SDK", go: "Go SDK" },
          responseComment: "The response includes {\"run_id\":\"...\",\"status\":\"running\"}",
          newIntentComment: "Generate one key for each new run intent, then reuse it for network retries of that same intent.",
          hint: (
            <>
              Tip: YOUR_TOKEN is a User Token. Open{" "}
              <Link
                href="/settings/user-tokens"
                className="font-bold text-[color:var(--ol-primary-dark)] underline-offset-2 hover:underline"
              >
                User Token settings
              </Link>{" "}
              for the current local-issuance status. Every new run intent needs a new idempotency key. After a timeout or disconnect, retry with the same key and unchanged request content.
            </>
          ),
        };

  const apiURL = apiBaseUrl ?? getApiBaseUrl();
  const requestBody = {
    agent_id: agentID,
    input: sampleInput ?? { your_field: "your_value" },
  };
  const requestBodyJSON = JSON.stringify(requestBody, null, 2);
  const sampleInputJSON = JSON.stringify(requestBody.input, null, 2);
  const sampleInputStringLiteral = JSON.stringify(sampleInputJSON);
  const agentIDLiteral = JSON.stringify(agentID);

  const snippets: Record<Tab, string> = {
    curl: `OPENLINKER_USER_TOKEN=your_user_token
AUTH_HEADER="Authorization: Bearer $OPENLINKER_USER_TOKEN"
# ${copy.newIntentComment}
OPENLINKER_RUN_KEY="\${OPENLINKER_RUN_KEY:-$(uuidgen)}"

curl -X POST ${apiURL}/api/v1/runs \\
  -H "$AUTH_HEADER" \\
  -H "Idempotency-Key: $OPENLINKER_RUN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${requestBodyJSON}'

# ${copy.responseComment}
curl -N ${apiURL}/api/v1/runs/RUN_ID/stream \\
  -H "$AUTH_HEADER" \\
  -H "Accept: text/event-stream"`,
    typescript: `import { OpenLinkerClient } from "@openlinker/sdk";

const openlinker = new OpenLinkerClient({
  baseUrl: "${apiURL}",
  userToken: process.env.OPENLINKER_USER_TOKEN,
});

// ${copy.newIntentComment}
const request = {
  agentId: ${agentIDLiteral},
  input: ${sampleInputJSON},
  idempotencyKey: crypto.randomUUID(),
};

const run = await openlinker.startAgentRun(request);
console.log(run.run_id, run.status, run.replayed);

await openlinker.streamRunEvents(run.run_id, {
  onEvent(event) {
    console.log(event.event, event.data);
  },
});`,
    go: `package main

import (
  "context"
  "crypto/rand"
  "encoding/json"
  "fmt"
  "log"
  "os"

  openlinker "github.com/OpenLinker-ai/openlinker-go"
)

func main() {
  client, err := openlinker.NewClient(
    "${apiURL}",
    openlinker.WithUserToken(os.Getenv("OPENLINKER_USER_TOKEN")),
  )
  if err != nil { log.Fatal(err) }

  // ${copy.newIntentComment}
  request := openlinker.RunAgentRequest{
    AgentID: ${agentIDLiteral},
    Input: json.RawMessage(${sampleInputStringLiteral}),
    IdempotencyKey: rand.Text(),
  }
  run, err := client.StartAgentRun(context.Background(), request)
  if err != nil { log.Fatal(err) }
  fmt.Println(run.RunID, run.Status, run.Replayed)

  err = client.StreamRunEvents(
    context.Background(),
    run.RunID,
    openlinker.StreamRunEventsOptions{},
    func(event openlinker.StreamRunEvent) error {
      fmt.Println(event.Event, string(event.Data))
      return nil
    },
  )
  if err != nil { log.Fatal(err) }
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
        {TABS.map((id) => (
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
            {copy.tabLabels[id]}
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

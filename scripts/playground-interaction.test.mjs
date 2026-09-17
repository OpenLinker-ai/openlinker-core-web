import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { isPlaygroundSubmitKey } from "../src/lib/playground-keyboard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function functionSource(source, fileName, name) {
  const tree = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = tree.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert.ok(declaration, `${name} must remain a top-level production function`);
  return declaration.getText(tree);
}

test("playground submit keys follow chat conventions without breaking IME", () => {
  assert.equal(isPlaygroundSubmitKey({ key: "Enter" }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", metaKey: true }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", ctrlKey: true }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", shiftKey: true }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", isComposing: true }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", keyCode: 229 }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "a" }), false);
});

test("playground creates immediately, retains long-wait final sync, and fits desktop viewport", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const page = await readFile(
    path.join(root, "src/app/(user)/playground/[slug]/page.tsx"),
    "utf8",
  );
  assert.match(runner, /"Idempotency-Key": request\.idempotencyKey,[\s\S]{0,120}Prefer: "wait=0"/);
  assert.match(runner, /headers: \{ Prefer: `wait=\$\{runWaitSeconds\}` \}/);
  assert.match(runner, /<RunEventStream[\s\S]{0,180}runId=\{railResult\.run_id\}[\s\S]{0,80}enabled/);
  assert.match(runner, /data-playground-composer/);
  assert.match(runner, /<PlaygroundDetailPanel/);
  assert.doesNotMatch(runner, /xl:sticky/);
  assert.doesNotMatch(runner, /xl:max-h-\[calc\(100vh/);
  assert.match(runner, /isPlaygroundSubmitKey\(\{[\s\S]{0,180}isComposing:/);
  assert.match(runner, /Enter 发送 · Shift\+Enter 换行/);
  assert.match(page, /min-\[1120px\]:flex-1/,
    "the workspace takes the space the layout leaves, above the footer");
  assert.match(page, /min-\[1120px\]:grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(page, /100dvh/,
    "subtracting chrome heights by hand breaks whenever the topbar or footer changes");

  assert.match(page, /data-workspace-fill/,
    "the page opts into the one-screen shell instead of guessing chrome heights");
  const globals = await readFile(path.join(root, "src/app/globals.css"), "utf8");
  assert.match(globals, /body:has\(main\[data-workspace-fill\]\)/);
  assert.match(globals, /height: 100dvh;\n\s+overflow: hidden;/,
    "the shell is exactly one viewport so the footer stays visible without page scroll");
  assert.match(
    globals,
    /@media \(min-width: 1120px\) \{\s*\n\s*body:has\(main\[data-workspace-fill\]\)/,
    "locking the body below the page's own fill breakpoint strands everything under the fold",
  );
  const fillBreakpoints = new Set([
    ...[...globals.matchAll(/@media \(min-width: (\d+)px\) \{\s*\n\s*body:has\(main\[data-workspace-fill\]\)/g)].map((m) => m[1]),
    ...[...page.matchAll(/min-\[(\d+)px\]:flex-1/g)].map((m) => m[1]),
  ]);
  assert.equal(fillBreakpoints.size, 1,
    "the shell lock and the page fill must start at the same width");

  const layout = await readFile(path.join(root, "src/app/layout.tsx"), "utf8");
  assert.match(layout, /<body className="flex min-h-screen flex-col">/);
  assert.match(layout, /<div className="flex min-h-0 flex-1 flex-col">/,
    "the page container must take the remaining height so content plus footer is one screen");
  assert.doesNotMatch(page, /ol-page-title/,
    "the breadcrumb already names this page; no second title block");
});

test("run detail lives in one movable card instead of a stack of panels", async () => {
  const rail = await readFile(
    path.join(root, "src/components/playground/detail-panel.tsx"),
    "utf8",
  );
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const resultPanel = await readFile(
    path.join(root, "src/components/playground/result-panel.tsx"),
    "utf8",
  );

  assert.match(rail, /data-playground-detail-rail/);
  assert.match(runner, /const \[detailsOpen, setDetailsOpen\] = useState\(false\)/,
    "run details start collapsed behind their own toggle");
  assert.match(runner, /detailsOpen \? copy\.hideDetails : copy\.showDetails/,
    "the toolbar toggle stays after opening, so the column can be closed again");
  assert.match(runner, /min-\[1000px\]:hidden/,
    "label width comes from CSS, so the first paint does not swap labels after hydration");
  assert.match(runner, /container\.scrollTo\(\{ top: container\.scrollHeight/,
    "the thread scrolls itself");
  assert.doesNotMatch(runner, /\.scrollIntoView\(/,
    "scrollIntoView drags every scrollable ancestor, which makes the page jump");
  assert.match(runner, /aria-pressed=\{detailsOpen\}/);
  assert.match(runner, /!\(detailsOpen && !roomyViewport\)/,
    "below 1400px the browser column and the details column take turns");
  assert.match(runner, /\{detailsOpen && railTurn \?/, "the column renders only while the toggle is on");
  assert.match(runner, /const selectedIndex/, "an opened details column follows the latest turn until one is picked");
  for (const tab of ["事件", "实际 input", "原始响应", "Events", "Actual input", "Raw response"]) {
    assert.ok(rail.includes(tab), `detail rail is missing the ${tab} view`);
  }
  assert.match(rail, /onPrevious|onNext/, "turn-to-turn navigation replaces repeated per-turn panels");
  assert.match(rail, /label=\{copy\.close\}/, "the opened column carries its own close control");
  assert.equal(
    (rail.match(/shrink-0/g) ?? []).length >= 4,
    true,
    "only the tab body may shrink; header, input echo, tabs and meta must keep their height",
  );
  assert.match(rail, /onPointerDown=\{onDragStart\}/, "the opened details can be dragged out of the way");
  assert.match(rail, /drag\.key === resetKey/, "a new turn puts the card back where it belongs");
  assert.match(runner, /detailsOpen \? "min-\[1120px\]:pr-\[436px\]"/,
    "the conversation reserves the card's space instead of hiding under it");
  assert.ok(rail.includes("[overflow-wrap:anywhere]") || rail.includes("truncate"));

  assert.equal(
    (rail.match(/copy\.runId/g) ?? []).length,
    1,
    "the Run ID is shown exactly once",
  );
  const conversationTurn = functionSource(runner, "runner.tsx", "ConversationTurn");
  assert.equal(
    conversationTurn.includes("run_id"),
    false,
    "the conversation shows messages, not Run identifiers",
  );

  for (const removed of ["费用状态", "下一步", "打开工作流", "开发者 API", "调用结果"]) {
    assert.equal(
      resultPanel.includes(removed),
      false,
      `${removed} duplicated information the conversation or the rail already carries`,
    );
  }
  assert.match(resultPanel, /export function ExecutionPathBox/);
  assert.match(resultPanel, /export function RunOutputView/);
});

test("provider tool progress has localized safe rendering", async () => {
  const stream = await readFile(
    path.join(root, "src/components/run/run-event-stream.tsx"),
    "utf8",
  );
  assert.match(stream, /payload\.provider !== "codex"/);
  for (const value of [
    "web_search",
    "command",
    "mcp_tool",
    "browser",
    "联网搜索",
    "Web search",
    "providerToolEventMeta",
  ]) {
    assert.ok(stream.includes(value), `missing provider progress value: ${value}`);
  }
  assert.doesNotMatch(stream, /payload\.(?:command|arguments|thread_id)/);

  assert.match(stream, /provider_error_kind/, "an interrupted provider run must say why it stopped");
  assert.match(stream, /max_messages/);
  assert.match(stream, /incomplete_response/);
  for (const value of ["模型服务中断", "Model service interrupted", "本轮没有产出"]) {
    assert.ok(stream.includes(value), `missing provider interruption copy: ${value}`);
  }

  const labels = await readFile(path.join(root, "src/lib/i18n-labels.ts"), "utf8");
  assert.match(labels, /PROVIDER_ERROR: \{/, "PROVIDER_ERROR must not fall back to a bare code");
  assert.match(labels, /provider_failed: \{/);
});

test("turn chips and rail links keep run details reachable in one click", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const rail = await readFile(
    path.join(root, "src/components/playground/detail-panel.tsx"),
    "utf8",
  );
  const browserPanel = await readFile(
    path.join(root, "src/components/playground/browser-observation-panel.tsx"),
    "utf8",
  );

  const turnCard = functionSource(runner, "runner.tsx", "ConversationTurn");
  assert.ok(turnCard.includes("onOpenDetails"), "every turn can be selected into the run details column");
  assert.ok(turnCard.includes("aria-expanded"));
  assert.ok(turnCard.includes("statusLabel(turn.status, locale)"));

  assert.ok(rail.includes("/run/${encodeURIComponent(runId)}"));
  assert.ok(rail.includes('target="_blank"'));
  assert.ok(rail.includes('rel="noopener noreferrer"'));
  assert.ok(rail.includes("/registry"));
  assert.ok(browserPanel.includes('target="_blank"'));
  assert.ok(browserPanel.includes('rel="noopener noreferrer"'));

  assert.ok(
    runner.indexOf("data-playground-composer") < runner.indexOf("<PlaygroundDetailPanel"),
    "the composer stays ahead of the run details for small screens",
  );
});

test("the browser stage carries live observation and human takeover", async () => {
  const stage = await readFile(
    path.join(root, "src/components/playground/browser-stage.tsx"),
    "utf8",
  );
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );

  assert.match(stage, /<PlaygroundBrowserObservation/, "read-only frames stay on the shared panel");
  assert.match(stage, /<BrowserHumanControl/, "takeover uses Core's browser-control state machine");
  assert.match(stage, /enabled=\{status === "running"\}/);
  assert.match(stage, /data-playground-browser-stage/);

  assert.match(runner, /<PlaygroundBrowserStage/);
  assert.match(runner, /hasPlaygroundBrowserObservation/, "the stage only opens for Runs with Browser evidence");
  assert.match(runner, /copy\.hideStage : copy\.showStage|copy\.showStage/);
  assert.match(runner, /useMinimumWidth\(1120\)/,
    "columns only exist where the workspace has a fixed height");
  assert.ok(
    runner.indexOf("<PlaygroundBrowserStage") < runner.indexOf("<PlaygroundDetailPanel"),
    "the browser column sits between the conversation and the run details column",
  );
});

test("run details keep following new turns, and dragging stays inside the viewport", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const panel = await readFile(
    path.join(root, "src/components/playground/detail-panel.tsx"),
    "utf8",
  );
  const control = await readFile(
    path.join(root, "src/components/run/browser-human-control.tsx"),
    "utf8",
  );

  assert.match(runner, /selectedTurnIndex\(turns, selection\)/,
    "which turn the column shows must come from the tested rule, not an inline guess");
  assert.match(runner, /failureFocusTurnId\(turns\)/,
    "only a failure in the newest turn may claim the details column");
  assert.doesNotMatch(
    runner,
    /\}, \[failedTurnId, latestTurnId\]\)/,
    "re-pinning an old failure on every new turn blocks following again",
  );

  assert.match(panel, /dragOffsetBounds\(\{/);
  assert.match(panel, /clippingAncestorRects\(node\)/,
    "the drag range must account for ancestors that clip their overflow");
  assert.match(panel, /margin: dragMarginPX/);
  assert.match(panel, /style\.overflow, style\.overflowX, style\.overflowY/);

  assert.match(
    control,
    /window\.setInterval\(\(\) => void refresh\(\), browserControlPollMS\)/,
    "takeover state must not depend on another surface rendering the event stream",
  );
  assert.match(control, /if \(!enabled\) return;/);
});

test("the conversation shows the whole reply and the toggles show their state", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const output = await readFile(
    path.join(root, "src/components/playground/output-summary.ts"),
    "utf8",
  );

  assert.match(output, /export function conversationText/);
  assert.match(
    runner,
    /conversationText\(result\.output \?\? \{\}, locale\)/,
    "a long answer must not reach the thread already clamped to a preview",
  );
  assert.doesNotMatch(runner, /summarizeOutputText/);

  assert.equal(
    (runner.match(/border-\[color:var\(--ol-primary\)\]\/35 bg-\[color:var\(--ol-mint\)\]/g) ?? []).length,
    2,
    "both toolbar toggles must look different when what they open is on screen",
  );
  assert.equal((runner.match(/aria-pressed=/g) ?? []).length, 2);
  assert.doesNotMatch(runner, /ol-mini-btn shrink-0/,
    "新会话 shares the toolbar's default look rather than the accent pill");
});

test("the thread fills its column and the Browser view waits for a picture", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const page = await readFile(
    path.join(root, "src/app/(user)/playground/[slug]/page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    runner,
    /max-w-\[980px\]/,
    "capping the panel leaves empty bands; the reading measure belongs on the messages",
  );
  assert.match(runner, /max-w-\[min\(86%,720px\)\]/);
  assert.match(runner, /max-w-\[min\(92%,880px\)\]/);
  assert.match(page, /max-w-\[1760px\]/, "the workspace uses the width a wide screen offers");

  // globals.css carries `main.mx-auto { max-width: 96rem !important }`, which silently
  // beats the utility class. The override must exist and must carry the same number.
  const globalsCss = await readFile(path.join(root, "src/app/globals.css"), "utf8");
  assert.match(
    globalsCss,
    /main\.mx-auto\[data-workspace-fill\] \{[\s\S]*?max-width: 1760px !important;/,
    "the global main rule overrides the utility class unless the fill page overrides it back",
  );
  assert.doesNotMatch(
    globalsCss,
    /main\.mx-auto\[data-workspace-fill\] \{[\s\S]*?padding: 24px[^}]*48px/,
    "the 48px bottom padding is what put a blank band under the composer",
  );
  const widthDeclarations = new Set([
    ...[...page.matchAll(/max-w-\[(\d+)px\]/g)].map((m) => m[1]),
    ...[...globalsCss.matchAll(/main\.mx-auto\[data-workspace-fill\] \{[\s\S]*?max-width: (\d+)px !important;/g)].map((m) => m[1]),
  ]);
  assert.equal(widthDeclarations.size, 1, "the utility class and the override must agree");

  assert.match(
    runner,
    /const stageHasPicture = stageTurn\?\.status === "running" \|\| Boolean\(stageSnapshot\);/,
    "a finished Run with no retained frame must not claim half the workspace",
  );
  assert.doesNotMatch(
    runner,
    /stageHasPicture[\s\S]{0,120}stageHandoff/,
    "the handoff frame belongs to a running continuation, not to a finished Run",
  );
  assert.match(runner, /\(stageChoice \?\? stageHasPicture\)/,
    "an explicit open or close always wins over the automatic choice");
  assert.doesNotMatch(runner, /stageHidden/);
});

test("nothing in the workspace can push the page wider than the viewport", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );

  assert.match(
    runner,
    /<div className="relative flex min-h-0 min-w-0 flex-col/,
    "nowrap text inside the workspace must not set a minimum width",
  );

  // The grid children are the breadcrumb and the wrapper around the runner, not the
  // runner root; min-width: auto on either one is what widened the page at 320px.
  const shell = await readFile(
    path.join(root, "src/app/(user)/playground/[slug]/page.tsx"),
    "utf8",
  );
  assert.match(shell, /<div className="min-h-0 min-w-0">/,
    "the grid child holding the workspace must be allowed to shrink");
  assert.match(shell, /<nav className="flex min-w-0 flex-wrap items-center/,
    "a long breadcrumb wraps instead of setting the page's minimum width");
  assert.match(
    runner,
    /order-last ml-auto w-full min-w-0 text-\[11\.5px\][^"]*min-\[900px\]:truncate/,
    "truncating needs room to truncate into; on a phone the note wraps instead",
  );
});

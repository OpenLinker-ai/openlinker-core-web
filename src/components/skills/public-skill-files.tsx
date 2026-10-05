"use client";
import { useState } from "react";
import { AgentMarkdown } from "@/components/ui/agent-markdown";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
export function PublicSkillFiles({
  files,
  locale,
}: {
  files: Record<string, string>;
  locale: Locale;
}) {
  const c = resourceSharingMessages[locale];
  const [file, setFile] = useState("SKILL.md");
  const [source, setSource] = useState(false);
  const text = files[file] ?? "";
  const markdown = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return (
    <section className="min-w-0 rounded-2xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{c.files}</h2>
        <label className="min-w-0">
          <span className="sr-only">{c.selectFile}</span>
          <select
            className="max-w-full rounded-lg border border-[color:var(--ol-line)] p-2 text-sm"
            value={file}
            onChange={(e) => setFile(e.target.value)}
          >
            {Object.keys(files)
              .sort()
              .map((f) => (
                <option key={f}>{f}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="mb-5 flex gap-2">
        <button
          className="ol-mini-btn"
          aria-pressed={!source}
          onClick={() => setSource(false)}
        >
          {c.read}
        </button>
        <button
          className="ol-mini-btn"
          aria-pressed={source}
          onClick={() => setSource(true)}
        >
          {c.source}
        </button>
      </div>
      {!source && file.endsWith(".md") ? (
        <AgentMarkdown headingOffset={2}>{markdown}</AgentMarkdown>
      ) : (
        <pre
          tabIndex={0}
          className="max-h-[650px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[color:var(--ol-soft)] p-4 text-xs leading-relaxed"
        >
          {text}
        </pre>
      )}
    </section>
  );
}

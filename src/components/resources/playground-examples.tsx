"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { playgroundExampleIssue } from "@/lib/playground-input.mjs";
import { resourceJourneyMessages } from "@/messages/resource-journey";
export function PlaygroundExamples({ examples, preservedInput, inputSchema, value, onChange, disabled, locale }: {
  examples: { id?: string; title?: string; input_json: Record<string, unknown> }[];
  preservedInput?: string; inputSchema?: Record<string, unknown>; value: string; onChange: (value: string) => void; disabled: boolean; locale: Locale;
}) {
  const j = resourceJourneyMessages[locale];
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  if (!examples.length) return null;
  return <div className="mb-3 space-y-2">
    <p className="text-xs text-[color:var(--ol-muted)]">{j.sampleHint}</p>
    {preservedInput !== undefined && value === preservedInput && <p role="status" className="text-xs text-[color:var(--ol-muted)]">{j.draftPreserved}</p>}
    <div className="flex flex-wrap gap-2">{examples.map((example, i) => {
      const issue = playgroundExampleIssue(example.input_json, inputSchema);
      return <div key={example.id ?? i}><button type="button" className="ol-mini-btn" disabled={disabled || Boolean(issue)} title={issue ? j.invalidExample : undefined} onClick={() => {
        const next = JSON.stringify(example.input_json, null, 2);
        setUndo({ before: value, after: next });
        onChange(next);
      }}>{j.sample} · {example.title ?? String(i + 1)}</button>{issue && <p className="mt-1 text-xs text-amber-900">{j.invalidExample}</p>}</div>;
    })}</div>
    {undo && value === undo.after && <button type="button" className="ol-mini-btn" disabled={disabled} onClick={() => { onChange(undo.before); setUndo(null); }}>{j.undo}</button>}
  </div>;
}

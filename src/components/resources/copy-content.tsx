"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
export function CopyContent({
  value,
  label,
  locale,
  compact = false,
}: {
  value: string;
  label: string;
  locale: Locale;
  compact?: boolean;
}) {
  const [status, setStatus] = useState("");
  const c = resourceSharingMessages[locale];
  return (
    <div className="min-w-0 space-y-2">
      <button
        className="ol-mini-btn"
        disabled={!value}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus(c.copied);
          } catch {
            setStatus(c.copyFailed);
          }
        }}
      >
        {label}
      </button>
      <span className="ml-2 text-xs" role="status">
        {status}
      </span>
      {(!compact || status === c.copyFailed) && <pre
        tabIndex={0}
        className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[color:var(--ol-soft)] p-3 text-xs leading-relaxed"
      >
        {value || c.loading}
      </pre>}
    </div>
  );
}

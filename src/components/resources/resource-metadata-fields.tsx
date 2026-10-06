"use client";
import { useId } from "react";
import type { Locale } from "@/lib/i18n";
import type { ResourceMetadata } from "@/lib/resource-metadata";
import { resourceMetadataMessages } from "@/messages/resource-metadata";

export function ResourceMetadataFields({
  value,
  onChange,
  disabled,
  locale,
}: {
  value: ResourceMetadata;
  onChange: (value: ResourceMetadata) => void;
  disabled?: boolean;
  locale: Locale;
}) {
  const c = resourceMetadataMessages[locale];
  const prefix = useId();
  const limits = {
    publisher_name: 80,
    repository_url: 2048,
    license: 128,
    release_notes: 4000,
  };
  const style =
    "w-full min-w-0 rounded-lg border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-3 text-sm disabled:opacity-70";
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {(Object.keys(limits) as (keyof ResourceMetadata)[]).map((field) => (
        <label
          key={field}
          htmlFor={`${prefix}-${field}`}
          className={`min-w-0 space-y-1 ${field === "release_notes" ? "sm:col-span-2" : ""}`}
        >
          <span className="text-sm font-semibold">{c[field]}</span>
          {field === "release_notes" ? (
            <textarea
              id={`${prefix}-${field}`}
              rows={4}
              maxLength={limits[field]}
              value={value[field] ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
              className={style}
            />
          ) : (
            <input
              id={`${prefix}-${field}`}
              type={field === "repository_url" ? "url" : "text"}
              placeholder={
                field === "repository_url"
                  ? "https://github.com/owner/repository"
                  : undefined
              }
              maxLength={limits[field]}
              value={value[field] ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
              className={style}
            />
          )}
        </label>
      ))}
    </div>
  );
}

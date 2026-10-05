"use client";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import type { McpMetadata, ResourceMetadata } from "@/lib/resource-metadata";
import { resourceMetadataMessages } from "@/messages/resource-metadata";
import { ResourceMetadataFields } from "./resource-metadata-fields";

export function McpMetadataEditor({
  agentId,
  locale,
}: {
  agentId: string;
  locale: Locale;
}) {
  const { fetch } = useApi();
  const c = resourceMetadataMessages[locale];
  const [snapshot, setSnapshot] = useState<McpMetadata | null>(null);
  const [value, setValue] = useState<ResourceMetadata>({});
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "unavailable" | "conflict" | "failed" | null
  >(null);
  const [saved, setSaved] = useState(false);
  const path = `/api/v1/creator/agents/${encodeURIComponent(agentId)}/mcp-metadata`;
  // Token refresh changes useApi.fetch. Keep current credentials without
  // reloading the form and discarding local edits or a conflict message.
  const fetchRef = useRef(fetch);
  useEffect(() => {
    fetchRef.current = fetch;
  }, [fetch]);
  useEffect(() => {
    let active = true;
    fetchRef.current<McpMetadata>(path).then(
      (data) => {
        if (active) {
          setSnapshot(data);
          setValue(data.metadata);
          setError(null);
        }
      },
      () => {
        if (active) setError("unavailable");
      },
    );
    return () => {
      active = false;
    };
  }, [path, reload]);
  return (
    <form
      className="ol-panel mt-6 min-w-0 space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!snapshot || busy) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          const next = await fetch<McpMetadata>(path, {
            method: "PUT",
            body: { metadata: value, expected_revision: snapshot.revision },
          });
          setSnapshot(next);
          setValue(next.metadata);
          setSaved(true);
        } catch (e) {
          setError(
            e && typeof e === "object" && "status" in e && e.status === 409
              ? "conflict"
              : "failed",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">{c.edit}</h2>
      <p className="text-sm text-[color:var(--ol-muted)]">{c.disclosure}</p>
      {!snapshot && !error && <p role="status">{c.load}</p>}
      {snapshot && (
        <ResourceMetadataFields
          value={value}
          onChange={(v) => {
            setValue(v);
            setSaved(false);
          }}
          locale={locale}
          disabled={busy}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {c[error]}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          {c.saved}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className="ol-mini-btn" disabled={!snapshot || busy}>
          {busy ? c.saving : c.save}
        </button>
        {error && (
          <button
            className="ol-mini-btn"
            type="button"
            disabled={busy}
            onClick={() => {
              setSnapshot(null);
              setError(null);
              setSaved(false);
              setReload((n) => n + 1);
            }}
          >
            {c.reload}
          </button>
        )}
      </div>
    </form>
  );
}

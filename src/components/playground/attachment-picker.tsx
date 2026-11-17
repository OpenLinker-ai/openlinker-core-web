"use client";

import { useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import {
  PLAYGROUND_ATTACHMENT_LIMIT,
  playgroundDraftAttachmentCount,
  playgroundDraftWithAttachment,
  type PlaygroundAttachmentField,
} from "@/lib/playground-input.mjs";

export type PlaygroundUploadedAttachment = { url: string; filename: string; size: number; kind: "image" | "file" };

const MAX_BYTES = 30 * 1000 * 1000;

const copy = {
  zh: {
    add: (field: string, kind: "image" | "file") => `${kind === "image" ? "添加图片" : "添加文件"} · ${field}`,
    uploading: "正在上传…",
    added: (name: string) => `已添加 ${name}`,
    tooLarge: "单个附件不能超过 30 MB。",
    limit: `一次调用最多 ${PLAYGROUND_ATTACHMENT_LIMIT} 个附件。`,
    invalidDraft: "请先把输入改成合法的 JSON 对象，再添加附件。",
    failed: "附件上传失败，请重试。",
    hint: "附件只用于本次调用，调用结束后自动删除；原文件上传，不压缩。",
  },
  en: {
    add: (field: string, kind: "image" | "file") => `${kind === "image" ? "Add image" : "Add file"} · ${field}`,
    uploading: "Uploading…",
    added: (name: string) => `Added ${name}`,
    tooLarge: "Each attachment must be 30 MB or smaller.",
    limit: `At most ${PLAYGROUND_ATTACHMENT_LIMIT} attachments per call.`,
    invalidDraft: "Fix the input so it is a JSON object before adding attachments.",
    failed: "The attachment could not be uploaded. Try again.",
    hint: "Attachments are used for this call only and deleted when it ends; files are uploaded as is.",
  },
} as const;

/**
 * Upload buttons for the Agent's attachment fields. Each upload goes to Core
 * and its link is written into the JSON draft (replaced for one-link fields,
 * appended for multi-link fields), so what is sent stays visible and editable.
 */
export function PlaygroundAttachmentPicker({
  fields, value, onChange, disabled, locale, upload,
}: {
  fields: PlaygroundAttachmentField[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  locale: Locale;
  upload: (file: File) => Promise<PlaygroundUploadedAttachment>;
}) {
  const text = copy[locale === "zh" ? "zh" : "en"];
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; message: string } | null>(null);
  if (fields.length === 0) return null;

  async function add(field: PlaygroundAttachmentField, files: FileList | null) {
    const chosen = Array.from(files ?? []);
    if (chosen.length === 0) return;
    let draft = value;
    if (playgroundDraftAttachmentCount(draft, fields) + chosen.length > PLAYGROUND_ATTACHMENT_LIMIT) {
      setStatus({ error: true, message: text.limit });
      return;
    }
    if (chosen.some(file => file.size > MAX_BYTES)) {
      setStatus({ error: true, message: text.tooLarge });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const names: string[] = [];
      for (const file of field.multiple ? chosen : chosen.slice(0, 1)) {
        try {
          playgroundDraftWithAttachment(draft, field, "probe");
        } catch {
          setStatus({ error: true, message: text.invalidDraft });
          return;
        }
        const uploaded = await upload(file);
        draft = playgroundDraftWithAttachment(draft, field, uploaded.url);
        names.push(uploaded.filename);
        onChange(draft);
      }
      setStatus({ error: false, message: text.added(names.join("、")) });
    } catch {
      setStatus({ error: true, message: text.failed });
    } finally {
      setBusy(false);
      const input = inputs.current[field.key];
      if (input) input.value = "";
    }
  }

  return (
    <div className="mb-2 space-y-1.5" data-playground-attachments>
      <div className="flex flex-wrap gap-2">
        {fields.map(field => (
          <label key={field.key} className={`ol-mini-btn cursor-pointer ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}>
            <input
              ref={element => { inputs.current[field.key] = element; }}
              type="file"
              className="sr-only"
              multiple={field.multiple}
              accept={field.kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : undefined}
              disabled={disabled || busy}
              onChange={event => void add(field, event.target.files)}
            />
            {busy ? text.uploading : text.add(field.key, field.kind)}
          </label>
        ))}
      </div>
      <p className="text-[11px] font-semibold leading-5 text-[color:var(--ol-muted)]">{text.hint}</p>
      {status ? (
        <p role={status.error ? "alert" : "status"} className={`text-[11px] font-bold ${status.error ? "text-red-700" : "text-[color:var(--ol-green)]"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}

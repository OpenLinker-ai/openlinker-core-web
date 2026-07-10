"use client";

/**
 * 设置页 · 账户资料 section。
 *
 * 视觉来自 prototype/openlinker-flow-23-settings.png：
 *   - profile-row：64px 品牌色首字母头像 + 名称 + 登录邮箱
 *   - 显示名可编辑保存，邮箱只读。
 *
 * 只展示 /api/v1/me 当前提供的真实账号字段，不生成用户名、个人简介或地区占位。
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

interface Props {
  email: string;
  displayName: string;
  locale?: Locale;
}

interface FieldRowProps {
  label: string;
  value: string;
  hint?: string;
  action?: string;
  editable?: boolean;
  onEdit?: () => void;
}

function FieldRow({
  label,
  value,
  hint,
  action = "编辑",
  editable,
  onEdit,
}: FieldRowProps) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-[color:var(--ol-line)] py-3 first:border-t-0">
      <label className="text-[12px] font-bold text-[color:var(--ol-muted)]">
        {label}
      </label>
      <div className="text-[13px] font-semibold text-[color:var(--ol-ink)]">
        <span>{value}</span>
        {hint && (
          <span className="mt-0.5 block text-[12px] font-medium text-[color:var(--ol-muted)]">
            {hint}
          </span>
        )}
      </div>
      {editable ? (
        <button type="button" onClick={onEdit} className="ol-mini-btn">
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function AccountSection({ email, displayName, locale = "zh" }: Props) {
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const effectiveName = name || displayName;
  const initial = (effectiveName || email || "?").trim().charAt(0).toUpperCase();
  const fallbackName = email.split("@")[0] || "user";
  const copy =
    locale === "zh"
      ? {
          edit: "编辑",
          title: "账户资料",
          body: "邮箱用于登录；显示名称会出现在 Agent 所有者信息中。",
          tooShort: "显示名称至少 2 个字符",
          saved: "账户资料已保存",
          failed: "保存失败，请稍后再试",
          saving: "保存中...",
          save: "保存",
          editName: "编辑名称",
          displayName: "显示名称",
          empty: "未填写",
          email: "邮箱",
          emailHint: "用于登录；当前页面不支持修改",
        }
      : {
          edit: "Edit",
          title: "Account Profile",
          body: "Your email is used for sign-in; your display name appears in Agent owner details.",
          tooShort: "Display name must be at least 2 characters",
          saved: "Account profile saved",
          failed: "Could not save. Try again later.",
          saving: "Saving...",
          save: "Save",
          editName: "Edit name",
          displayName: "Display name",
          empty: "Not set",
          email: "Email",
          emailHint: "Used for sign-in; it cannot be changed on this page.",
        };

  const saveDisplayName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error(copy.tooShort);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/v1/me", {
        method: "PATCH",
        body: { display_name: trimmed },
      });
      toast.success(copy.saved);
      setName(trimmed);
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ol-panel ol-panel-pad space-y-4">
      <header>
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </h3>
        <p className="mt-1 text-[12px] text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
      </header>

      {/* profile-row：首字母头像 + 显示名称 + 登录邮箱 */}
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border border-[color:var(--ol-line)] bg-white p-3.5">
        <div
          className="ol-profile-avatar grid h-16 w-16 place-items-center rounded-full text-[26px] font-black text-white"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[14px] font-[850] text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
            />
          ) : (
            <div className="truncate text-[16px] font-[850] text-[color:var(--ol-ink)]">
              {effectiveName || fallbackName}
            </div>
          )}
          <div className="mt-1 truncate text-[12px] text-[color:var(--ol-muted)]">
            {email}
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={editing ? saveDisplayName : () => setEditing(true)}
          className="ol-mini-btn"
        >
          {saving ? copy.saving : editing ? copy.save : copy.editName}
        </button>
      </div>

      {/* field-rows */}
      <div>
        <FieldRow
          label={copy.displayName}
          value={effectiveName || copy.empty}
          action={copy.edit}
          editable
          onEdit={() => setEditing(true)}
        />
        <FieldRow
          label={copy.email}
          value={email}
          hint={copy.emailHint}
        />
      </div>
    </section>
  );
}

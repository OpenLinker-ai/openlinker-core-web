"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export function SecuritySection({ locale = "zh" }: { locale?: Locale }) {
  const { fetch: apiFetch } = useApi();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const copy =
    locale === "zh"
      ? {
          title: "安全",
          body: "修改邮箱密码登录账号的密码；第三方登录账号请继续使用对应登录方式。",
          current: "当前密码",
          next: "新密码",
          minPassword: "新密码至少 8 位",
          saved: "密码已修改",
          failed: "修改失败，请稍后再试",
          saving: "保存中...",
          submit: "修改密码",
        }
      : {
          title: "Security",
          body: "Update the password for email-based sign-in. Third-party sign-in accounts should continue using their provider.",
          current: "Current password",
          next: "New password",
          minPassword: "New password must be at least 8 characters",
          saved: "Password updated",
          failed: "Could not update password. Try again later.",
          saving: "Saving...",
          submit: "Update password",
        };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error(copy.minPassword);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/v1/me/password", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      toast.success(copy.saved);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="security" className="ol-panel ol-panel-pad scroll-mt-24">
      <header>
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </h3>
        <p className="mt-1 text-[12px] text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
      </header>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.current}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.next}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? copy.saving : copy.submit}
        </button>
      </form>
    </section>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

function oauthProviderLabel(provider?: string) {
  if (!provider) return "";
  const normalized = provider.trim();
  if (!normalized) return "";
  const known: Record<string, string> = {
    github: "GitHub",
    google: "Google",
  };
  return known[normalized.toLowerCase()] ?? normalized;
}

export function SecuritySection({
  locale = "zh",
  hasPassword,
  isOAuthUser,
  oauthProvider,
}: {
  locale?: Locale;
  hasPassword?: boolean;
  isOAuthUser?: boolean;
  oauthProvider?: string;
}) {
  const { fetch: apiFetch } = useApi();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const canChangePassword = hasPassword !== false;
  const providerLabel = oauthProviderLabel(oauthProvider);
  const copy =
    locale === "zh"
      ? {
          title: "安全",
          body: "修改内网账号的邮箱密码登录凭据。",
          oauthOnlyBody: `此账号通过 ${providerLabel || "第三方 OAuth"} 登录，当前没有邮箱密码，因此不能在这里修改密码。请继续使用对应登录方式。`,
          oauthBadge: "第三方登录账号",
          oauthProviderPrefix: "OAuth",
          current: "当前密码",
          next: "新密码",
          confirm: "确认新密码",
          minPassword: "新密码至少 8 位",
          mismatch: "两次输入的新密码不一致",
          samePassword: "新密码不能与当前密码相同",
          saved: "密码已修改",
          failed: "修改失败，请稍后再试",
          saving: "保存中...",
          submit: "修改密码",
        }
      : {
          title: "Security",
          body: "Update the email/password credentials for your intranet account.",
          oauthOnlyBody: `This account signs in with ${providerLabel || "a third-party OAuth provider"} and does not have an email password, so password changes are not available here. Continue signing in with that provider.`,
          oauthBadge: "Third-party sign-in",
          oauthProviderPrefix: "OAuth",
          current: "Current password",
          next: "New password",
          confirm: "Confirm new password",
          minPassword: "New password must be at least 8 characters",
          mismatch: "New passwords do not match",
          samePassword: "New password must be different from the current password",
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
    if (newPassword !== newPasswordConfirm) {
      toast.error(copy.mismatch);
      return;
    }
    if (currentPassword === newPassword) {
      toast.error(copy.samePassword);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/v1/me/password", {
        method: "POST",
        signOutOnUnauthorized: false,
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        },
      });
      toast.success(copy.saved);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.failed));
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
          {canChangePassword ? copy.body : copy.oauthOnlyBody}
        </p>
      </header>

      {!canChangePassword ? (
        <div className="mt-4 rounded-xl border border-[color:var(--ol-line)] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[color:var(--ol-muted)]">
            <span className="ol-chip ol-chip-blue">{copy.oauthBadge}</span>
            {isOAuthUser && providerLabel ? <span className="ol-chip">{copy.oauthProviderPrefix} · {providerLabel}</span> : null}
          </div>
        </div>
      ) : null}

      {canChangePassword ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
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
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.confirm}
          </label>
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            disabled={saving}
            className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !newPasswordConfirm}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? copy.saving : copy.submit}
        </button>
      </form>
      ) : null}
    </section>
  );
}

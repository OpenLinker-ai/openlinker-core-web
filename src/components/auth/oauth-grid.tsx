"use client";

/**
 * <OAuthGrid /> —— 已启用 OAuth 按钮 grid。
 *
 * 只有在公开环境变量显式启用时才渲染，避免未配置 provider 时把新用户
 * 带到失败路径，也避免在当前免费阶段展示钱包登录入口。
 */

import type { ReactNode } from "react";

import { getApiBaseUrl } from "@/lib/api-root";
import { cn } from "@/lib/utils";

type Provider = "google" | "github";

interface OAuthGridProps {
  /** 整体 disabled（提交中） */
  disabled?: boolean;
}

export function OAuthGrid({ disabled }: OAuthGridProps) {
  const apiUrl = getApiBaseUrl();
  const providers = enabledOAuthProviders();
  const handleGoogle = () => {
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };
  const handleGithub = () => {
    window.location.href = `${apiUrl}/api/v1/auth/github`;
  };

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="ol-oauth-grid">
      {providers.includes("google") ? (
        <OAuthButton
          provider="google"
          label="Google"
          icon={<GoogleMark />}
          onClick={handleGoogle}
          disabled={disabled}
        />
      ) : null}
      {providers.includes("github") ? (
        <OAuthButton
          provider="github"
          label="GitHub"
          icon={<GithubMark />}
          onClick={handleGithub}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

export function hasEnabledOAuthProviders(): boolean {
  return enabledOAuthProviders().length > 0;
}

function enabledOAuthProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === "true") {
    providers.push("google");
  }
  if (process.env.NEXT_PUBLIC_ENABLE_GITHUB_OAUTH === "true") {
    providers.push("github");
  }
  return providers;
}

interface OAuthButtonProps {
  provider: Provider;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

function OAuthButton({
  provider,
  label,
  icon,
  onClick,
  disabled,
  title,
}: OAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="ol-oauth-btn"
    >
      <span className={cn("ol-oauth-ico", provider)} aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Google 多色 G 图标（紧凑版，22x22 圆角方块内的小 G） */
function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#ffffff"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#ffffff"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity="0.78"
      />
      <path
        fill="#ffffff"
        d="M5.84 14.09c-.22-.66-.35-1.37-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        opacity="0.6"
      />
      <path
        fill="#ffffff"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        opacity="0.86"
      />
    </svg>
  );
}

/** GitHub Octocat 单色 mark。 */
function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#ffffff"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.77 1.05.77 2.11 0 1.52-.01 2.74-.01 3.12 0 .3.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}

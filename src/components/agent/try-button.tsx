"use client";

/**
 * Agent 详情页"在线试用"按钮。
 *
 * 行为：
 * - 未登录：toast 提示并跳 /login，带 callbackUrl 让登录后回到 playground
 * - 已登录：直接跳 /playground/[slug]（playground 由模块 4 实现）
 *
 * 注：本仓库登录跳回参数是 callbackUrl（见 login-form.tsx），不是 from。
 */

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";

export function TryButton({ slug, locale = "zh" }: { slug: string; locale?: Locale }) {
  const router = useRouter();
  const { status } = useSession();
  const copy =
    locale === "zh"
      ? { login: "请先登录后再试用", label: "在线试用" }
      : { login: "Sign in before trying this Agent", label: "Try online" };

  const handleClick = () => {
    if (status === "loading") return;

    const target = `/playground/${slug}`;

    if (status === "unauthenticated") {
      toast.info(copy.login);
      router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
      return;
    }

    router.push(target);
  };

  // 视觉精修：原型 .btn.primary —— 主绿色主按钮
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
  >
      {copy.label}
    </button>
  );
}

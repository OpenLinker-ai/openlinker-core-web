"use client";

/**
 * 注册表单。
 *
 * 流程：
 *   1. zod 校验（email / password 长度 / display_name 长度）
 *   2. apiFetch POST /api/v1/auth/register
 *   3. 成功 → signIn("credentials", { redirect: false }) 立即建立 NextAuth session
 *   4. 失败按 ApiError.code 分流 toast / form.setError
 *
 * Phase 1 视觉：与 LoginForm 共享 ol-auth-* token；OAuth 4 按钮 grid（仅 Google 走业务）。
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { OAuthGrid, hasEnabledOAuthProviders } from "@/components/auth/oauth-grid";
import { authHref, safeAuthCallback } from "@/components/auth/callback-url";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ApiError, apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

function registerSchema(locale: Locale) {
  return z.object({
    email: z.email(locale === "zh" ? "请输入有效的邮箱地址" : "Enter a valid email address"),
    password: z.string().min(8, locale === "zh" ? "密码至少 8 位" : "Password must be at least 8 characters"),
    display_name: z
      .string()
      .min(2, locale === "zh" ? "昵称至少 2 个字符" : "Display name must be at least 2 characters")
      .max(50, locale === "zh" ? "昵称最多 50 个字符" : "Display name must be 50 characters or fewer"),
  });
}

type RegisterValues = {
  email: string;
  password: string;
  display_name: string;
};

type RegisterResponse = {
  user_id: string;
  email: string;
  display_name: string;
  jwt: string;
};

export function RegisterForm({ locale = "zh" }: { locale?: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeAuthCallback(
    searchParams.get("callbackUrl") || searchParams.get("from"),
  );
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          autoLoginFailed: "注册成功但自动登录失败，请手动登录",
          success: "注册成功，欢迎加入 OpenLinker",
          email: "邮箱",
          displayName: "显示名",
          displayNamePlaceholder: "你的昵称",
          password: "密码",
          passwordPlaceholder: "至少 8 位",
          submit: "注册",
          submitting: "注册中…",
          divider: "或使用第三方账号",
          hasAccount: "已有账号？",
          login: "立即登录",
        }
      : {
          autoLoginFailed: "Account created, but automatic sign-in failed. Please sign in manually.",
          success: "Account created. Welcome to OpenLinker.",
          email: "Email",
          displayName: "Display name",
          displayNamePlaceholder: "Your name",
          password: "Password",
          passwordPlaceholder: "At least 8 characters",
          submit: "Sign up",
          submitting: "Creating account…",
          divider: "Or use a third-party account",
          hasAccount: "Already have an account?",
          login: "Sign in",
        };

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(locale)),
    defaultValues: { email: "", password: "", display_name: "" },
  });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    try {
      await apiFetch<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: values,
      });

      // 注册成功后，用同样的凭证拿到 NextAuth session
      const signInRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        // 极少见的边缘情况：注册成功但登录失败
        toast.error(copy.autoLoginFailed);
        router.push(authHref("/login", callbackUrl));
        return;
      }

      toast.success(copy.success);
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      handleRegisterError(err, form, locale);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <label className="ol-auth-field-label" htmlFor="reg-email">
                {copy.email}
              </label>
              <FormControl>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  disabled={submitting}
                  className="ol-auth-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <label className="ol-auth-field-label" htmlFor="reg-name">
                {copy.displayName}
              </label>
              <FormControl>
                <input
                  id="reg-name"
                  autoComplete="nickname"
                  placeholder={copy.displayNamePlaceholder}
                  disabled={submitting}
                  className="ol-auth-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <label className="ol-auth-field-label" htmlFor="reg-password">
                {copy.password}
              </label>
              <FormControl>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={copy.passwordPlaceholder}
                  disabled={submitting}
                  className="ol-auth-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={submitting}
          className="ol-auth-submit"
        >
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitting ? copy.submitting : copy.submit}
        </button>

        {hasEnabledOAuthProviders() ? (
          <>
            <div className="ol-auth-divider">
              <span>{copy.divider}</span>
            </div>
            <OAuthGrid disabled={submitting} />
          </>
        ) : null}

        <p className="ol-auth-bottom">
          {copy.hasAccount}
          <Link href={authHref("/login", callbackUrl)}>{copy.login}</Link>
        </p>
      </form>
    </Form>
  );
}

/**
 * 把 ApiError 映射成 toast / setError。
 */
function handleRegisterError(
  err: unknown,
  form: ReturnType<typeof useForm<RegisterValues>>,
  locale: Locale,
) {
  const copy =
    locale === "zh"
      ? {
          conflict: "邮箱已被注册",
          conflictField: "该邮箱已被注册",
          invalid: "提交内容不符合要求",
          failed: "注册失败，请稍后重试",
        }
      : {
          conflict: "This email is already registered",
          conflictField: "This email is already registered",
          invalid: "Submitted content is invalid",
          failed: "Sign-up failed. Try again later.",
        };

  if (err instanceof ApiError) {
    switch (err.code) {
      case "CONFLICT":
        toast.error(copy.conflict);
        form.setError("email", { message: copy.conflictField });
        return;
      case "VALIDATION_FAILED": {
        // 后端可能返回 details: { field: message }
        const details = err.details as
          | Record<string, string>
          | { field?: string; message?: string }
          | undefined;
        if (details && typeof details === "object") {
          // 形如 { email: "...", password: "..." }
          let matched = false;
          for (const key of ["email", "password", "display_name"] as const) {
            const msg = (details as Record<string, unknown>)[key];
            if (typeof msg === "string") {
              form.setError(key, { message: msg });
              matched = true;
            }
          }
          if (!matched && err.message) {
            toast.error(err.message);
          }
        } else {
          toast.error(err.message || copy.invalid);
        }
        return;
      }
      default:
        toast.error(err.message || copy.failed);
        return;
    }
  }
  toast.error(copy.failed);
}

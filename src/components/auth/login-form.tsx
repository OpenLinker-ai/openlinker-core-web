"use client";

/**
 * 登录表单。
 *
 * 流程：zod 校验 → next-auth signIn("credentials") → 成功 push 到首页 / callbackUrl。
 * 错误：NextAuth credentials provider 失败时返回 res.error，统一显示"邮箱或密码错误"。
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

import { authHref, safeAuthCallback } from "@/components/auth/callback-url";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import type { Locale } from "@/lib/i18n";

function loginSchema(locale: Locale) {
  return z.object({
    email: z.email(locale === "zh" ? "请输入有效的邮箱地址" : "Enter a valid email address"),
    password: z.string().min(1, locale === "zh" ? "请输入密码" : "Enter your password"),
  });
}

type LoginValues = {
  email: string;
  password: string;
};

export function LoginForm({ locale = "zh" }: { locale?: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeAuthCallback(
    searchParams.get("callbackUrl") || searchParams.get("from"),
  );
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          invalid: "邮箱或密码错误",
          success: "登录成功",
          failed: "登录失败，请稍后重试",
          email: "邮箱",
          password: "密码",
          registerPrompt: "没有账号？",
          register: "注册",
          submit: "登录",
          submitting: "登录中…",
        }
      : {
          invalid: "Email or password is incorrect",
          success: "Signed in",
          failed: "Sign-in failed. Try again later.",
          email: "Email",
          password: "Password",
          registerPrompt: "Need an account?",
          register: "Sign up",
          submit: "Sign in",
          submitting: "Signing in…",
        };

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(locale)),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!res || res.error) {
        toast.error(copy.invalid);
        return;
      }

      toast.success(copy.success);
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error(copy.failed);
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
              <label className="ol-auth-field-label" htmlFor="login-email">
                {copy.email}
              </label>
              <FormControl>
                <input
                  id="login-email"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <label className="ol-auth-field-label" htmlFor="login-password">
                {copy.password}
              </label>
              <FormControl>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={submitting}
                  className="ol-auth-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="ol-auth-row justify-end">
          <span>
            {copy.registerPrompt}{" "}
            <Link href={authHref("/register", callbackUrl)}>{copy.register}</Link>
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="ol-auth-submit"
        >
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitting ? copy.submitting : copy.submit}
        </button>

      </form>
    </Form>
  );
}

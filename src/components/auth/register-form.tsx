"use client";

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
import { ApiError, apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

function registerSchema(locale: Locale) {
  const copy =
    locale === "zh"
      ? {
          email: "请输入有效的邮箱地址",
          password: "密码至少 8 位",
          confirm: "请再次输入密码",
          mismatch: "两次输入的密码不一致",
          nameMin: "显示名至少 2 个字符",
          nameMax: "显示名最多 50 个字符",
        }
      : {
          email: "Enter a valid email address",
          password: "Password must be at least 8 characters",
          confirm: "Confirm your password",
          mismatch: "Passwords do not match",
          nameMin: "Display name must be at least 2 characters",
          nameMax: "Display name must be 50 characters or fewer",
        };

  return z
    .object({
      email: z.email(copy.email),
      display_name: z.string().min(2, copy.nameMin).max(50, copy.nameMax),
      password: z.string().min(8, copy.password),
      password_confirm: z.string().min(1, copy.confirm),
    })
    .refine((value) => value.password === value.password_confirm, {
      path: ["password_confirm"],
      message: copy.mismatch,
    });
}

type RegisterValues = {
  email: string;
  display_name: string;
  password: string;
  password_confirm: string;
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
  const reauth = searchParams.get("reauth") === "1";
  const callbackUrl = safeAuthCallback(
    searchParams.get("callbackUrl") || searchParams.get("from"),
  );
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          success: "注册成功",
          signinFailed: "账号已创建，请登录",
          failed: "注册失败，请稍后重试",
          conflict: "该邮箱已注册",
          email: "邮箱",
          displayName: "显示名",
          displayNamePlaceholder: "你的昵称",
          password: "密码",
          passwordPlaceholder: "至少 8 位",
          passwordConfirm: "确认密码",
          passwordConfirmPlaceholder: "再次输入密码",
          submit: "注册",
          submitting: "注册中…",
          hasAccount: "已有账号？",
          login: "登录",
        }
      : {
          success: "Account created",
          signinFailed: "Account created. Please sign in.",
          failed: "Sign-up failed. Try again later.",
          conflict: "This email is already registered",
          email: "Email",
          displayName: "Display name",
          displayNamePlaceholder: "Your name",
          password: "Password",
          passwordPlaceholder: "At least 8 characters",
          passwordConfirm: "Confirm password",
          passwordConfirmPlaceholder: "Re-enter password",
          submit: "Sign up",
          submitting: "Creating account…",
          hasAccount: "Already have an account?",
          login: "Sign in",
        };

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(locale)),
    defaultValues: {
      email: "",
      display_name: "",
      password: "",
      password_confirm: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    try {
      await apiFetch<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: values.email,
          display_name: values.display_name,
          password: values.password,
        },
      });

      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.success(copy.signinFailed);
        router.push(authHref("/login", callbackUrl, { reauth }));
        router.refresh();
        return;
      }
      toast.success(copy.success);
      // Complete automatic sign-in with the same single document navigation as login.
      window.location.replace(callbackUrl);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("email", { message: copy.conflict });
        toast.error(copy.conflict);
      } else {
        toast.error(copy.failed);
      }
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
              <label className="ol-auth-field-label" htmlFor="reg-display-name">
                {copy.displayName}
              </label>
              <FormControl>
                <input
                  id="reg-display-name"
                  autoComplete="name"
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

        <FormField
          control={form.control}
          name="password_confirm"
          render={({ field }) => (
            <FormItem>
              <label className="ol-auth-field-label" htmlFor="reg-password-confirm">
                {copy.passwordConfirm}
              </label>
              <FormControl>
                <input
                  id="reg-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder={copy.passwordConfirmPlaceholder}
                  disabled={submitting}
                  className="ol-auth-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button type="submit" disabled={submitting} className="ol-auth-submit">
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitting ? copy.submitting : copy.submit}
        </button>

        <div className="ol-auth-row">
          <span>{copy.hasAccount}</span>
          <Link href={authHref("/login", callbackUrl, { reauth })}>{copy.login}</Link>
        </div>
      </form>
    </Form>
  );
}

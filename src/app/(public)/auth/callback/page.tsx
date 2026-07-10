import { redirect } from "next/navigation";

import { authHref, safeAuthCallback } from "@/components/auth/callback-url";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "zh" ? "登录" : "Sign In" };
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(authHref("/login", safeAuthCallback(params.callbackUrl)));
}

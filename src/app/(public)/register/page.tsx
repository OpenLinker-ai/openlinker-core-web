import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { authHref, safeAuthCallback } from "@/components/auth/callback-url";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; from?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeAuthCallback(params.callbackUrl || params.from);
  redirect(authHref("/login", callbackUrl));
}

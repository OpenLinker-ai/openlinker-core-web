import { redirect } from "next/navigation";

import { authHref, safeAuthCallback } from "@/components/auth/callback-url";

export const metadata = {
  title: "Sign In",
};

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

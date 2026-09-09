import { redirect } from "next/navigation";

import { authHref } from "@/components/auth/callback-url";
import { isCreatorAgentUnauthorized } from "@/lib/creator-agent";

export function redirectCreatorAgentLogin(callbackUrl: string): never {
  // Core can reject a token while the NextAuth session still looks signed in.
  // Let the login page render instead of bouncing straight back to this page.
  redirect(authHref("/login", callbackUrl, { reauth: true }));
}

export function rethrowCreatorAgentPageError(error: unknown, callbackUrl: string): never {
  if (isCreatorAgentUnauthorized(error)) {
    redirectCreatorAgentLogin(callbackUrl);
  }
  throw error;
}

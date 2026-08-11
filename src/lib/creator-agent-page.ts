import { redirect } from "next/navigation";

import { authHref } from "@/components/auth/callback-url";
import { isCreatorAgentUnauthorized } from "@/lib/creator-agent";

export function redirectCreatorAgentLogin(callbackUrl: string): never {
  redirect(authHref("/login", callbackUrl));
}

export function rethrowCreatorAgentPageError(error: unknown, callbackUrl: string): never {
  if (isCreatorAgentUnauthorized(error)) {
    redirectCreatorAgentLogin(callbackUrl);
  }
  throw error;
}

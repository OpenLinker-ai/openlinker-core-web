import { Suspense } from "react";

import { OAuthCallbackHandler } from "./oauth-callback-handler";

export const metadata = {
  title: "Signing In",
};

export default function OAuthCallbackPage() {
  return (
    <main className="mx-auto mt-24 w-full max-w-md p-4 text-center">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Signing in...</p>
        }
      >
        <OAuthCallbackHandler />
      </Suspense>
    </main>
  );
}

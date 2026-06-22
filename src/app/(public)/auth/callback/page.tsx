import { Suspense } from "react";

import { Topbar } from "@/components/layout/topbar";
import { OAuthCallbackHandler } from "./oauth-callback-handler";

export const metadata = {
  title: "Signing In",
};

export default function OAuthCallbackPage() {
  return (
    <>
      <Topbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-16">
        <div className="grid min-h-64 place-items-center text-center">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Signing in...</p>
            }
          >
            <OAuthCallbackHandler />
          </Suspense>
        </div>
      </main>
    </>
  );
}

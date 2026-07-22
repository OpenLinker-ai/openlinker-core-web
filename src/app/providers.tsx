"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Suspense, useState, type ReactNode } from "react";

import { SessionExpiryGuard } from "@/components/auth/session-expiry-guard";
import { RouteTransitionFeedback } from "@/components/layout/route-transition-feedback";
import { ClientLocaleContext } from "@/hooks/use-client-locale";
import type { Locale } from "@/lib/i18n";

export function Providers({
  children,
  locale = "en",
  session,
}: {
  children: ReactNode;
  locale?: Locale;
  session?: Session | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ClientLocaleContext.Provider value={locale}>
      <SessionProvider session={session} refetchInterval={5 * 60} refetchOnWindowFocus>
        <SessionExpiryGuard />
        <Suspense fallback={null}>
          <RouteTransitionFeedback locale={locale} />
        </Suspense>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SessionProvider>
    </ClientLocaleContext.Provider>
  );
}

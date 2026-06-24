"use client";

import { useSyncExternalStore } from "react";

import { LoginForm } from "@/components/auth/login-form";
import type { Locale } from "@/lib/i18n";

interface AuthInteractivePanelProps {
  active?: "login";
  locale?: Locale;
}

export function AuthInteractivePanel({ locale = "zh" }: AuthInteractivePanelProps) {
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );

  if (!mounted) {
    return (
      <div
        className="mt-6 min-h-[330px]"
        aria-hidden="true"
        suppressHydrationWarning
      />
    );
  }

  return (
    <div className="mt-6">
      <LoginForm locale={locale} />
    </div>
  );
}

function subscribeMounted() {
  return () => {};
}

function getClientMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

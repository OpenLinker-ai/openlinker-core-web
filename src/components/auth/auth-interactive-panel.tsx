"use client";

import { useSyncExternalStore } from "react";

import { AuthTabs } from "@/components/auth/auth-tabs";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import type { Locale } from "@/lib/i18n";

interface AuthInteractivePanelProps {
  active: "login" | "register";
  locale?: Locale;
}

export function AuthInteractivePanel({
  active,
  locale = "zh",
}: AuthInteractivePanelProps) {
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
    <>
      <AuthTabs active={active} locale={locale} />
      <div className="mt-6">
        {active === "login" ? (
          <LoginForm locale={locale} />
        ) : (
          <RegisterForm locale={locale} />
        )}
      </div>
    </>
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

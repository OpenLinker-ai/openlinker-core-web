import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CLIAuthorize } from "@/components/auth/cli-authorize";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { cliLoginMessages } from "@/messages/cli-login";

export async function generateMetadata(): Promise<Metadata> {
  const copy = cliLoginMessages[await getLocale()];
  return { title: copy.title, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function CLIAuthorizePage({ searchParams }: {
  searchParams: Promise<{ user_code?: string | string[] }>;
}) {
  const [session, locale, params] = await Promise.all([auth(), getLocale(), searchParams]);
  const code = typeof params.user_code === "string" && /^[A-Za-z2-9-]{8,9}$/.test(params.user_code)
    ? params.user_code : "";
  if (!session?.jwt || session.authError) {
    const callback = `/cli/authorize${code ? `?user_code=${encodeURIComponent(code)}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }
  return <main className="px-6 py-12">
    <CLIAuthorize initialCode={code} account={session.user.email || session.user.name || session.user.id || ""} locale={locale} />
  </main>;
}

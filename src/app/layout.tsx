import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { IconSprite } from "@/components/ui/icon";
import { getLocale } from "@/lib/i18n-server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenLinker",
    template: "%s · OpenLinker",
  },
  description: "AI Agent invocation and orchestration marketplace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? { terms: "服务条款", privacy: "隐私政策" }
      : { terms: "Terms", privacy: "Privacy" };

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <IconSprite />
        <Providers>{children}</Providers>
        <footer className="border-t border-slate-200/70 bg-white/80 px-6 py-5 text-center text-xs text-slate-500">
          <span>OpenLinker</span>
          <span className="mx-2 text-slate-300">/</span>
          <a className="inline-flex min-h-8 items-center hover:text-slate-900" href="/terms">
            {copy.terms}
          </a>
          <span className="mx-2 text-slate-300">/</span>
          <a className="inline-flex min-h-8 items-center hover:text-slate-900" href="/privacy">
            {copy.privacy}
          </a>
        </footer>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

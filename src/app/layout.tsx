import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { IconSprite } from "@/components/ui/icon";
import { getLocale } from "@/lib/i18n-server";
import { Providers } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: {
      default: "OpenLinker Core Web",
      template: "%s · OpenLinker Core Web",
    },
    description:
      locale === "zh"
        ? "自托管 Agent 目录、调用、运行事件与实例管理"
        : "Self-hosted Agent Registry, invocation, run events, and instance administration",
    icons: {
      icon: "/openlinker-logo.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? { terms: "实例使用说明", privacy: "数据与隐私", status: "实例状态" }
      : { terms: "Instance Terms", privacy: "Data & Privacy", status: "Instance Status" };

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <IconSprite />
        <div className="flex min-h-screen flex-1 flex-col">
          <Providers locale={locale}>{children}</Providers>
        </div>
        <footer className="shrink-0 border-t border-slate-200/70 bg-white/80 px-6 py-5 text-center text-xs text-slate-500">
          <span>OpenLinker</span>
          <span className="mx-2 text-slate-300">/</span>
          <a className="inline-flex min-h-8 items-center hover:text-slate-900" href="/terms">
            {copy.terms}
          </a>
          <span className="mx-2 text-slate-300">/</span>
          <a className="inline-flex min-h-8 items-center hover:text-slate-900" href="/privacy">
            {copy.privacy}
          </a>
          <span className="mx-2 text-slate-300">/</span>
          <a className="inline-flex min-h-8 items-center hover:text-slate-900" href="/status">
            {copy.status}
          </a>
        </footer>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

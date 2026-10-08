import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { resourceUseMessages } from "@/messages/resource-use";
export function ResourceNavigation({ links, locale }: { links: { href: string; label: string; current: boolean }[]; locale: Locale }) {
  return <nav aria-label={resourceUseMessages[locale].navigation} className="mb-6 flex flex-wrap gap-2 border-b border-[color:var(--ol-line)] pb-4">
    {links.map(link => <Link key={link.href} href={link.href} aria-current={link.current ? "page" : undefined} className={`ol-mini-btn ${link.current ? "ol-mini-btn-primary" : ""}`}>{link.label}</Link>)}
  </nav>;
}
export function ResourceNextStep({ title, hint, href, label }: { title: string; hint: string; href: string; label: string }) {
  return <section className="ol-panel space-y-3 p-6">
    <h2 className="text-lg font-bold">{title}</h2>
    <p className="text-sm leading-relaxed text-[color:var(--ol-muted)]">{hint}</p>
    <Link href={href} className="ol-mini-btn ol-mini-btn-primary">{label}</Link>
  </section>;
}

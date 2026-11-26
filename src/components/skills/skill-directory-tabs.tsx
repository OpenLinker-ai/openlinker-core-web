import Link from "next/link";
import { Package, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { skillPackageMessages } from "@/messages/skill-package";
import { catalogMessages } from "@/messages/catalog";
import { catalogTabHref } from "@/lib/catalog.mjs";

export function SkillDirectoryTabs({
  locale,
  packages = false,
  catalog = false,
  catalogAvailable = false,
}: {
  locale: Locale;
  packages?: boolean;
  catalog?: boolean;
  catalogAvailable?: boolean;
}) {
  const copy = skillPackageMessages[locale];
  const capabilities = !packages && !catalog;
  return (
    <nav
      aria-label={copy.capabilities}
      className="mb-6 flex gap-2 border-b border-[color:var(--ol-line)] pb-4"
    >
      <Link
        className={`ol-filter-item ${capabilities ? "active" : ""}`}
        aria-current={capabilities ? "page" : undefined}
        href="/skills"
      >
        {copy.capabilities}
      </Link>
      <Link
        className={`ol-filter-item ${packages ? "active" : ""}`}
        aria-current={packages ? "page" : undefined}
        href="/skills?tab=packages"
      >
        {copy.packages}
      </Link>
      {catalogAvailable && (
        <Link
          className={`ol-filter-item ${catalog ? "active" : ""}`}
          aria-current={catalog ? "page" : undefined}
          href={catalogTabHref("skills")}
        >
          {catalogMessages[locale].tab}
        </Link>
      )}
    </nav>
  );
}

export function SkillPackagesIntro({ locale }: { locale: Locale }) {
  const copy = skillPackageMessages[locale];
  return (
    <section className="ol-panel p-8 md:p-12">
      <Package size={32} className="mb-6 text-[color:var(--ol-primary)]" />
      <h2 className="text-2xl font-black">{copy.publicTitle}</h2>
      <p className="mt-4 max-w-xl text-[color:var(--ol-muted)]">
        {copy.publicDescription}
      </p>
      <Link
        href="/hub/skills"
        className="ol-mini-btn mt-6 bg-[color:var(--ol-primary)]! text-white!"
      >
        {copy.publicAction}
        <ArrowUpRight size={16} />
      </Link>
      <p className="mt-6 max-w-xl text-sm text-[color:var(--ol-muted)]">
        {copy.publicNote}
      </p>
    </section>
  );
}

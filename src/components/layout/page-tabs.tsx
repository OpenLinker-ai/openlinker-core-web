import Link from "next/link";

import { cn } from "@/lib/utils";

export type PageTabItem = {
  label: string;
  desc?: string;
  href: string;
  active?: boolean;
};

export function PageTabs({
  items,
  ariaLabel = "Page tabs",
  className,
}: {
  items: ReadonlyArray<PageTabItem>;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "grid gap-2 rounded-[22px] border border-[color:var(--ol-line)] bg-white/86 p-2 shadow-[0_18px_45px_-35px_rgba(16,32,51,0.35)] sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "rounded-[16px] border px-4 py-3 transition-colors",
            item.active
              ? "border-[color:var(--ol-primary)]/35 bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
              : "border-transparent bg-white text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/25 hover:text-[color:var(--ol-ink)]",
          )}
        >
          <span className="block text-[13px] font-black">{item.label}</span>
          {item.desc ? (
            <span className="mt-1 block text-[11.5px] font-bold leading-relaxed opacity-75">
              {item.desc}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

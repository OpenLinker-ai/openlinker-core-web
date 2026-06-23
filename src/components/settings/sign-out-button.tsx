import { Icon } from "@/components/ui/icon";
import { signOut } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export function SettingsSignOutButton({ locale = "zh" }: { locale?: Locale }) {
  return (
    <form
      className="w-full sm:w-auto"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[color:var(--ol-line)] bg-white px-4 text-[13.5px] font-black text-[color:var(--ol-muted)] shadow-sm transition hover:border-[color:var(--ol-primary)]/35 hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-ink)] sm:w-auto"
      >
        <Icon name="x" size="sm" />
        {locale === "zh" ? "退出登录" : "Sign out"}
      </button>
    </form>
  );
}

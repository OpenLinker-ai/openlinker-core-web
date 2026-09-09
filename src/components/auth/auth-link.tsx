"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore, type ComponentProps } from "react";
import { authHref, authReturnPath } from "./callback-url";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: "/login" | "/register";
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => window.location.hash;
const serverHash = () => "";

function CurrentPageAuthLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  return <Link {...props} href={authHref(href, authReturnPath(pathname, search.toString(), hash), { reauth: search.get("reauth") === "1" })} />;
}

/** Keep the originating path, filters and anchor through sign-in and registration. */
export function AuthLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <CurrentPageAuthLink {...props} />
    </Suspense>
  );
}

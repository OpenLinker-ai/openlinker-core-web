/**
 * Next.js 16 proxy（原 middleware）。
 *
 * 鉴权拦截：
 *   - 未登录访问 protected 路由组（/my /usage /runs /publish /hub /settings /playground /inbox /run /admin）
 *     → 跳 /login?callbackUrl=<原 path>，登录成功后由登录页 router.replace(callbackUrl || "/")
 *   - 已登录访问 /login → 返回安全的 callbackUrl
 *
 * Next.js 16 强制 proxy 跑在 nodejs runtime，所以 NextAuth `auth()` 可以直接用。
 * 不需要 edge-safe 拆分。
 */

import { safeAuthCallback } from "@/components/auth/callback-url";
import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/my",
  "/usage",
  "/runs",
  "/publish",
  "/hub",
  "/settings",
  "/playground",
  "/inbox",
  "/run",
  "/admin",
];

const AUTH_PAGES = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/hub") {
    return NextResponse.redirect(hubCompatibilityUrl(req));
  }

  const session = await auth();
  const signedIn = Boolean(session?.jwt && !session.authError);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // A Core 401 may require signing in again even before the session expires.
  if (isAuthPage && signedIn && req.nextUrl.searchParams.get("reauth") !== "1") {
    const callback = safeAuthCallback(req.nextUrl.searchParams.get("callbackUrl") || req.nextUrl.searchParams.get("from"));
    return NextResponse.redirect(new URL(callback, req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};

function hubCompatibilityUrl(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  const path =
    tab === "access"
      ? "/hub/access"
      : tab === "registry"
        ? "/hub/bridge"
        : tab === "skills"
          ? "/hub/skills"
          : "/hub/agents";
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return url;
}

/**
 * Next.js 16 proxy（原 middleware）。
 *
 * 鉴权拦截：
 *   - 未登录访问 protected 路由组（/my /runs /publish /hub /settings /playground /inbox /run /admin）
 *     → 跳 /login?callbackUrl=<原 path>，登录成功后由登录页 router.push(callbackUrl || "/")
 *   - 已登录访问 /login → 跳首页
 *
 * Next.js 16 强制 proxy 跑在 nodejs runtime，所以 NextAuth `auth()` 可以直接用。
 * 不需要 edge-safe 拆分。
 */

import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

// 需要登录才能访问的路径前缀（startsWith 匹配）
const PROTECTED_PREFIXES = [
  "/my",
  "/runs",
  "/publish",
  "/hub",
  "/settings",
  "/playground",
  "/inbox",
  "/run",
  "/admin",
];

// 已登录用户不应该再看到的页面
const AUTH_PAGES = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // 未登录 → 强制跳登录页，并在 query 里带原路径，方便登录后 redirect 回去
  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // 已登录 → /login 没意义，跳首页
  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 所有路径除了静态资源和 api/auth（NextAuth 自身路由不能拦）
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};

/**
 * 登录/注册/找回密码共用的站内回跳地址校验。
 *
 * 这个值最终会交给 next/navigation 的 router.push / router.replace。Next 会用
 * `new URL(href, location.href)` 解析它，只要解析出的 origin 与当前站点不同就走硬跳转，
 * 因此任何能被浏览器解析成跨源地址的字符串都构成登录后开放重定向。
 *
 * 浏览器 URL 解析有两条容易被忽略的归一化规则：
 *   1. 反斜杠等价于斜杠 —— "/\host" 与 "//host" 一样解析为 "https://host"
 *   2. 解析前会先丢弃 TAB/LF/CR —— "/<TAB>/host" 同样解析为 "https://host"
 * 所以只判断 "//" 前缀是不够的，必须先按同样的规则归一化，再要求第二个字符不是分隔符。
 */
export function safeAuthCallback(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) {
    return "/";
  }
  // 与浏览器解析 URL 前的行为对齐：TAB/LF/CR 会被直接丢弃
  const normalized = value.replace(/[\t\n\r]/g, "");
  // 必须是站内绝对路径，且第二个字符不能是 "/" 或 "\"（两者都会被解析成跨源 authority）
  if (!normalized.startsWith("/") || /^\/[\\/]/.test(normalized)) {
    return "/";
  }
  return normalized;
}

export function authHref(path: string, callbackUrl: string): string {
  const safeCallback = safeAuthCallback(callbackUrl);
  if (safeCallback === "/") {
    return path;
  }
  return `${path}?${new URLSearchParams({ callbackUrl: safeCallback })}`;
}

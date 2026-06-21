export function safeAuthCallback(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export function authHref(path: string, callbackUrl: string): string {
  const safeCallback = safeAuthCallback(callbackUrl);
  if (safeCallback === "/") {
    return path;
  }
  return `${path}?${new URLSearchParams({ callbackUrl: safeCallback })}`;
}

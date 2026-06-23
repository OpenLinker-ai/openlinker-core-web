const DEFAULT_CORE_API_PORT = "8080";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" || normalized === "::1" || normalized === "127.0.0.1" || normalized.startsWith("127.");
}

export function inferApiBaseFromWebOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === "openlinker.ai" || url.hostname.endsWith(".openlinker.ai")) {
      return "https://api.openlinker.ai";
    }
    if (!isLoopbackHostname(url.hostname)) {
      return stripTrailingSlash(url.origin);
    }
    return `${url.protocol}//${url.hostname}:${DEFAULT_CORE_API_PORT}`;
  } catch {
    return `http://localhost:${DEFAULT_CORE_API_PORT}`;
  }
}

function envApiBaseUrl(): string | undefined {
  if (typeof window === "undefined") {
    const explicit =
      process.env.CORE_API_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL;
    if (explicit) return stripTrailingSlash(explicit);

    const webOrigin =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    if (webOrigin) return inferApiBaseFromWebOrigin(webOrigin);

    return undefined;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  }

  return undefined;
}

export function getApiBaseUrlForRequest(request: Request): string {
  const envApiUrl = envApiBaseUrl();
  if (envApiUrl) return envApiUrl;
  return inferApiBaseFromWebOrigin(new URL(request.url).origin);
}

export function getApiBaseUrlForPath(path?: string, method = "GET"): string {
  void path;
  void method;
  const envApiUrl = envApiBaseUrl();
  if (envApiUrl) return stripTrailingSlash(envApiUrl);
  if (typeof window !== "undefined" && window.location?.origin) {
    return inferApiBaseFromWebOrigin(window.location.origin);
  }
  return inferApiBaseFromWebOrigin("http://localhost:3000");
}

export function getApiBaseUrl(): string {
  const envApiUrl = envApiBaseUrl();
  if (envApiUrl) return stripTrailingSlash(envApiUrl);
  if (typeof window !== "undefined" && window.location?.origin) {
    return inferApiBaseFromWebOrigin(window.location.origin);
  }
  return `http://localhost:${DEFAULT_CORE_API_PORT}`;
}

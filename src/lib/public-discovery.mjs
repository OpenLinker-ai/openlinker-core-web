function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

// Runtime-only and fail closed: production mode alone never enables indexing.
export function publicIndexingEnabled(env = process.env) {
  return env.OPENLINKER_INDEXING_ENABLED === "true";
}

const NO_INDEX_PREFIXES = [
  "/api",
  "/auth",
  "/cli",
  "/creator",
  "/forgot-password",
  "/healthz",
  "/_openlinker",
  "/login",
  "/readyz",
  "/register",
  "/tasks",
];

// Each frontend supplies its own workspace paths; account/diagnostic rules are shared.
export function shouldNoIndex(pathname, privatePrefixes = [], env = process.env) {
  return !publicIndexingEnabled(env) || [...NO_INDEX_PREFIXES, ...privatePrefixes].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function publicWebOrigin(env = process.env) {
  const explicit = normalizeOrigin(env.OPENLINKER_PUBLIC_ORIGIN);
  if (explicit) return explicit;
  const authOrigin = normalizeOrigin(env.NEXTAUTH_URL);
  if (authOrigin) return authOrigin;
  const vercelOrigin = normalizeOrigin(env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  return vercelOrigin ?? "http://localhost:3000";
}

export function publicSitemapEntries(origin, paths) {
  const base = normalizeOrigin(origin) ?? "http://localhost:3000";
  return paths.map((route) => ({
    url: new URL(route, `${base}/`).toString(),
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}

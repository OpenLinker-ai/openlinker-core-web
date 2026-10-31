export function shouldNoIndex(
  pathname: string,
  privatePrefixes?: readonly string[],
  env?: Record<string, string | undefined>,
): boolean;
export function publicIndexingEnabled(env?: Record<string, string | undefined>): boolean;
export function publicWebOrigin(env?: Record<string, string | undefined>): string;
export function publicSitemapEntries(origin: string, paths: readonly string[]): Array<{
  url: string;
  changeFrequency: "weekly";
  priority: number;
}>;

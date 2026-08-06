export function publicWebOrigin(env?: Record<string, string | undefined>): string;
export function publicSitemapEntries(origin: string, paths: readonly string[]): Array<{
  url: string;
  changeFrequency: "weekly";
  priority: number;
}>;

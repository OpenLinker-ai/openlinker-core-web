export function safeMarkdownURL(url: string): string;
export function splitJSONAutolink(
  url: string,
  precedingText: string,
): { url: string; suffix: string } | null;
export function remarkJSONAutolinkBoundaries(): (tree: unknown) => void;

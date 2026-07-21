export type RouteSearchParamValue = string | string[] | undefined;

export function pathWithSearchParams(
  path: string,
  params: Record<string, RouteSearchParamValue>,
): string;

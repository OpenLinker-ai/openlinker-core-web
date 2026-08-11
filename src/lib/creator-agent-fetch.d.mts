export type CreatorAgentPage<T> =
  | T[]
  | {
      items?: T[];
      total?: number;
    };

export type CreatorAgentPageGroup<T, Visibility extends string> = {
  visibility: Visibility;
  pages: CreatorAgentPage<T>[];
};

export function fetchCreatorAgentByParamWith<T>(
  fetcher: (path: string) => Promise<T>,
  param: string,
  isUnavailable: (error: unknown) => boolean,
): Promise<T | null>;

export function fetchCreatorAgentPagesWith<T, Visibility extends string>(
  fetchPage: (
    visibility: Visibility,
    limit: number,
    offset: number,
  ) => Promise<CreatorAgentPage<T>>,
  visibilities: readonly Visibility[],
  options?: {
    limit?: number;
    maxConcurrency?: number;
  },
): Promise<CreatorAgentPageGroup<T, Visibility>[]>;

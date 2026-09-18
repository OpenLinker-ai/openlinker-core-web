export type ProviderToolProgressPresentation = {
  title: string;
  detail: string;
  icon: "globe" | "refresh" | "check" | "warn";
  tone: string;
};

export function providerToolProgressPresentation(
  payload: Record<string, unknown>,
  locale: "zh" | "en",
): ProviderToolProgressPresentation | null;

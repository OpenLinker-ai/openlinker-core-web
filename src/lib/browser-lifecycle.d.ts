export type BrowserLifecyclePresentation = {
  title: string;
  detail: string;
  icon: "refresh" | "check" | "warn";
  tone: string;
};

export function browserLifecyclePresentation(
  payload: Record<string, unknown>,
  locale: "zh" | "en",
): BrowserLifecyclePresentation;

export function displayBrowserLifecyclePayload(
  payload: Record<string, unknown>,
): Record<string, unknown>;

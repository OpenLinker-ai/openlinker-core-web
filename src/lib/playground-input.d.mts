import type { Locale } from "./i18n";

export type PlaygroundInputSchema = Record<string, unknown>;
export type PlaygroundExample = { input_json: Record<string, unknown> };

export class PlaygroundInputError extends Error {
  path: string;
  reason: string;
  constructor(path: string, reason: string);
}

export function playgroundInitialDraft(input: {
  prefill?: string;
  selectedExample?: Record<string, unknown>;
  examples?: PlaygroundExample[];
  inputSchema?: PlaygroundInputSchema;
  locale?: Locale;
}): string;

export function parsePlaygroundDraft(
  text: string,
  inputSchema?: PlaygroundInputSchema,
): Record<string, unknown>;

export function playgroundViolationMessage(details: unknown, locale: Locale): string;
export function inputSchemaAllowsProperty(
  inputSchema: PlaygroundInputSchema | undefined,
  property: string,
): boolean;

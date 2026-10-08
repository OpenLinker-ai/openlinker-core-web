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
  inputMode?: "auto" | "json";
}): string;

export function playgroundStructuredInputFields(
  inputSchema: PlaygroundInputSchema | undefined,
  inputMode?: "auto" | "json",
): { required: string[]; properties: string[] } | null;

export function parsePlaygroundDraft(
  text: string,
  inputSchema?: PlaygroundInputSchema,
  inputMode?: "auto" | "json",
): Record<string, unknown>;

export function playgroundViolationMessage(details: unknown, locale: Locale): string;
export function inputSchemaAllowsProperty(
  inputSchema: PlaygroundInputSchema | undefined,
  property: string,
): boolean;

export function playgroundExampleIssue(value: unknown, inputSchema?: PlaygroundInputSchema): PlaygroundInputError | null;
export function playgroundSubmissionCanRetry(status?: number): boolean;

export function playgroundSubmissionAction(status?: number, code?: string): "edit" | "conflict" | "none";

export function playgroundPrefillIsValid(prefill: unknown, inputSchema?: PlaygroundInputSchema): boolean;

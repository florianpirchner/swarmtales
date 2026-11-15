// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The limits of one request and the fixed request fields that are merged over a provider's payload. */

/**
 * The limits of one request of a model.
 *
 * @public
 */
export interface RequestLimits {
	/** The limit of output tokens. */
	readonly maxOutputTokens: number;
	/** The time one request may take, in milliseconds. */
	readonly timeoutMs: number;
}

/**
 * The time one request may take, in milliseconds.
 *
 * @public
 */
export const REQUEST_TIMEOUT_MS = 120_000;

/**
 * The client retries of one request (429 and 5xx, with backoff). They are the provider library's, not a loop here.
 *
 * @public
 */
export const PROVIDER_RETRIES = 6;

/**
 * The request limits a model can keep (lesson P75): a provider refuses an output limit above the model's own.
 *
 * @param maxTokens - The output limit of the model, from the provider's table; zero when the table has none.
 * @param limits - The limits that were asked for.
 * @returns The limits, with the output limit cut to the model's own maximum.
 *
 * @public
 */
export function limitsFor(maxTokens: number, limits: RequestLimits): RequestLimits {
	return maxTokens > 0 && limits.maxOutputTokens > maxTokens ? { ...limits, maxOutputTokens: maxTokens } : limits;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null;
}

/**
 * Merges fixed request fields (for example the OpenRouter routing) over the provider payload.
 *
 * @param payload - The payload the provider library built.
 * @param defaults - The fixed fields; `undefined` for none.
 * @returns The merged payload; the payload itself when there are no fixed fields or it is no object.
 *
 * @public
 */
export function withRequestDefaults(payload: unknown, defaults: Readonly<Record<string, unknown>> | undefined): unknown {
	if (defaults === undefined || !isRecord(payload)) return payload;
	return { ...payload, ...defaults };
}

/**
 * The tool choices of a request.
 *
 * @public
 */
export const TOOL_CHOICES = ["auto", "required", "none"] as const;

/**
 * One tool choice of a request.
 *
 * @public
 */
export type ToolChoice = (typeof TOOL_CHOICES)[number];

/**
 * Tells whether a text is a tool choice.
 *
 * @param value - The text.
 * @returns True when it is one of {@link TOOL_CHOICES}.
 *
 * @public
 */
export function isToolChoice(value: string): value is ToolChoice {
	return TOOL_CHOICES.some((choice) => choice === value);
}

/**
 * The request field for a tool choice. An OpenAI-compatible endpoint takes the text itself; the Anthropic
 * messages API takes an object, and its `any` is the `required` of the others.
 *
 * @param choice - The tool choice.
 * @param api - The API of the model, as the provider library names it.
 * @returns The request fields to merge over the payload.
 *
 * @public
 */
export function toolChoiceDefaults(choice: ToolChoice, api: string): Readonly<Record<string, unknown>> {
	if (api === "anthropic-messages") return { tool_choice: { type: choice === "required" ? "any" : choice } };
	return { tool_choice: choice };
}

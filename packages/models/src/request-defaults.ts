/** Merges fixed request fields (e.g. OpenRouter routing) over the provider payload. */
export function withRequestDefaults(payload: unknown, defaults: Readonly<Record<string, unknown>> | undefined): unknown {
	if (defaults === undefined || !isRecord(payload)) return payload;
	return { ...payload, ...defaults };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export const TOOL_CHOICES = ["auto", "required", "none"] as const;
export type ToolChoice = (typeof TOOL_CHOICES)[number];

export function isToolChoice(value: string): value is ToolChoice {
	return TOOL_CHOICES.some((choice) => choice === value);
}

/**
 * The request field for a per-run tool choice. OpenAI-compatible endpoints (OpenRouter and similar) take the
 * string itself; Anthropic's Messages API takes an object, and its "any" is the "required" of the others.
 */
export function toolChoiceDefaults(choice: ToolChoice, api: string): Readonly<Record<string, unknown>> {
	if (api === "anthropic-messages") return { tool_choice: { type: choice === "required" ? "any" : choice } };
	return { tool_choice: choice };
}

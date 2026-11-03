/** Merges fixed request fields (e.g. OpenRouter routing) over the provider payload. */
export function withRequestDefaults(payload: unknown, defaults: Readonly<Record<string, unknown>> | undefined): unknown {
	if (defaults === undefined || !isRecord(payload)) return payload;
	return { ...payload, ...defaults };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

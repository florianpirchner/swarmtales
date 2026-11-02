/**
 * Secrets out of error texts before they reach the signed log (step 18 challenge, chain-security
 * m7). A provider's error text, or an exception's message, is recorded as written (`turn_error`,
 * `gamemaker_error`, `run_ended.detail`), and a signed line cannot be edited later without breaking
 * the chain. Node's `Request` echoes a URL with credentials whole; a provider may echo the key it
 * was given. The patterns are deliberately narrow: the credentials of a URL, `sk-` keys and bearer
 * tokens.
 */

const PATTERNS: readonly (readonly [RegExp, string])[] = [
	// scheme://user:password@host, scheme://token@host
	[/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1[redacted]@"],
	// API keys shaped like sk-..., sk-ant-..., sk-or-v1-...
	[/\bsk-[A-Za-z0-9_-]{16,}/g, "sk-[redacted]"],
	[/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/g, "$1[redacted]"],
];

/** The text with URL credentials and API-key-shaped tokens replaced by `[redacted]`. */
export function redactSecrets(text: string): string {
	return PATTERNS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

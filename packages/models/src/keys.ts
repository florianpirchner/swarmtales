// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The key broker: a key exists in exactly one object and leaves it only into a provider's request. The broker is
 * handed an environment record and never reads the environment itself.
 */
import type { ApiKeyAuth } from "@earendil-works/pi-ai";
import { redactSecrets, redactWith, type Redact } from "@swarmtales/contracts";
import { noKey, shortKey, thrown } from "./errors.ts";

/**
 * The variables a provider's key is read from, first match wins (decision A13).
 *
 * @public
 */
export const KEY_VARIABLES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	anthropic: Object.freeze(["SWT_ANTHROPIC_API_KEY", "ARENA_ANTHROPIC_API_KEY"]),
	openrouter: Object.freeze(["SWT_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"]),
});

/**
 * What the provider library asks for when it builds a request. Only the provider adapters receive it.
 *
 * @public
 */
export type KeyAuth = ApiKeyAuth;

/**
 * The one holder of the keys. It has no method and no property that returns a key.
 *
 * @public
 */
export interface KeyBroker {
	/**
	 * The variables of `provider` that are missing; empty when a key is held. Names only.
	 *
	 * @param provider - The provider id.
	 * @returns The variable names that were tried and not set.
	 */
	missing(provider: string): readonly string[];
	/**
	 * The auth object for one provider: its `resolve` answers the key to the provider library. This is the one way a
	 * value leaves the broker.
	 *
	 * @param provider - The provider id.
	 * @returns The auth object, without `login` and `check`.
	 * @throws SwtError `SWT-X001` when no key is held; it names every variable tried.
	 */
	auth(provider: string): KeyAuth;
	/** Every held value replaced by `[redacted]`, then `redactSecrets` over the rest. */
	readonly redact: Redact;
	/**
	 * Tells whether a held value occurs in the text: as it is, base64 or base64url encoded, or percent-encoded.
	 *
	 * @param text - The text to look into.
	 * @returns True when a held value occurs. Never the value or its position.
	 */
	leaks(text: string): boolean;
	/**
	 * The text of the broker in a message: `JSON.stringify` and Node's inspection give the same.
	 *
	 * @returns A fixed text without a value.
	 */
	toString(): string;
}

const SHORTEST = 16;
const SHOWN = "[KeyBroker]";
const UNRESERVED = /[A-Za-z0-9\-._~]/;

// The forms a value may take in a text: as it is, base64 and base64url (without the padding, so both paddings match), percent-encoded in both cases of the hex digits.
function formsOf(value: string): readonly string[] {
	const bytes = [...new TextEncoder().encode(value)];
	const base64 = btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
	const percent = bytes.map((byte) => (UNRESERVED.test(String.fromCharCode(byte)) ? String.fromCharCode(byte) : `%${byte.toString(16).padStart(2, "0")}`)).join("");
	const upper = percent.replace(/%[0-9a-f]{2}/g, (code) => code.toUpperCase());
	return [...new Set([value, base64, base64.replace(/\+/g, "-").replace(/\//g, "_"), percent, upper])];
}

interface Held {
	readonly variable: string;
	readonly value: string;
}

// The first variable of the list that is set (not empty); a later one is not looked at, also when the first is too short.
function firstSet(env: Readonly<Record<string, string | undefined>>, names: readonly string[]): Held | undefined {
	for (const variable of names) {
		const value = env[variable];
		if (value !== undefined && value !== "") return { variable, value };
	}
	return undefined;
}

function authOf(provider: string, held: Held): KeyAuth {
	const { variable, value } = held;
	return Object.freeze({
		name: `${provider} API key`,
		resolve: () => Promise.resolve({ auth: { apiKey: value }, source: variable }),
	});
}

/**
 * Reads the keys once from the given record and keeps them in a closure. An empty variable counts as not set.
 *
 * @param env - The environment, as a record; the broker reads only the variables of `variables` from it.
 * @param variables - Provider id to the variables its key is read from, first match wins; left out: {@link KEY_VARIABLES}.
 * @returns The frozen broker. `JSON.stringify`, `String` and Node's inspection of it give a fixed text.
 * @throws SwtError `SWT-X006` when the first variable that is set holds fewer than 16 characters; one issue per such variable.
 * @example
 * ```ts
 * const broker = createKeyBroker(readEnv(Object.values(KEY_VARIABLES).flat()));
 * broker.missing("anthropic"); // [] when a key is held
 * ```
 *
 * @public
 */
export function createKeyBroker(env: Readonly<Record<string, string | undefined>>, variables: Readonly<Record<string, readonly string[]>> = KEY_VARIABLES): KeyBroker {
	const found = Object.entries(variables).flatMap(([provider, names]) => {
		const held = firstSet(env, names);
		return held === undefined ? [] : [{ provider, held }];
	});
	const good = found.filter(({ held }) => held.value.length >= SHORTEST);
	const keys = new Map(good.map(({ provider, held }) => [provider, held]));
	// Longest first: a value that is part of another one leaves no rest behind.
	const values = [...new Set(good.map(({ held }) => held.value))].sort((a, b) => b.length - a.length);
	const forms = values.flatMap(formsOf);
	// The held values go first: after the patterns, a value with a character outside a pattern (`sk-aaa.bbb`) would be cut in two and its rest stay.
	const redact = redactWith((text) => values.reduce((current, value) => current.split(value).join("[redacted]"), text), redactSecrets);
	const short = found.filter(({ held }) => held.value.length < SHORTEST).map(({ held }) => shortKey(held.variable));
	if (short.length > 0) throw thrown(short, redact);
	const broker = {
		missing: (provider: string): readonly string[] => (keys.has(provider) ? [] : [...(variables[provider] ?? [])]),
		auth: (provider: string): KeyAuth => {
			const held = keys.get(provider);
			if (held === undefined) throw thrown(noKey(provider, variables[provider] ?? []), redact);
			return authOf(provider, held);
		},
		redact,
		leaks: (text: string): boolean => forms.some((form) => text.includes(form)),
		toJSON: (): string => SHOWN,
		toString: (): string => SHOWN,
		[Symbol.for("nodejs.util.inspect.custom")]: (): string => SHOWN,
	};
	return Object.freeze(broker);
}

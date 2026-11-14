// SPDX-License-Identifier: Apache-2.0
/** The rules of the key broker (M2 spec 3.1). Every value is built here at run time; no test reads the real environment. */
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { SwtError } from "@swarmtales/contracts";
import { createKeyBroker, KEY_VARIABLES } from "../src/keys.ts";

// Built from parts: no committed text has the shape of a key.
const SHAPED = `${["s", "k"].join("")}-${"a".repeat(37)}`;
const PLAIN = `plain/value+with?odd&chars=${"z9".repeat(7)}`;
const OTHER = `second-name-${"q".repeat(20)}`;
const ENV = { SWT_ANTHROPIC_API_KEY: SHAPED, ARENA_ANTHROPIC_API_KEY: OTHER, OPENROUTER_API_KEY: PLAIN };
const VALUES = [SHAPED, PLAIN, OTHER];

function caught(run: () => unknown): SwtError {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error;
	}
	throw new TypeError("no SwtError was thrown");
}

async function keyOf(auth: ReturnType<ReturnType<typeof createKeyBroker>["auth"]>): Promise<unknown> {
	const result = await auth.resolve({ ctx: { env: () => Promise.resolve(undefined), fileExists: () => Promise.resolve(false) }, signal: new AbortController().signal });
	return result?.auth.apiKey;
}

describe("the key variables", () => {
	it("are the SWT_ name first, then the fallback of decision A13, and never ANTHROPIC_API_KEY", () => {
		expect(KEY_VARIABLES).toEqual({ anthropic: ["SWT_ANTHROPIC_API_KEY", "ARENA_ANTHROPIC_API_KEY"], openrouter: ["SWT_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"] });
		expect(Object.isFrozen(KEY_VARIABLES) && Object.isFrozen(KEY_VARIABLES.anthropic)).toBe(true);
	});
});

describe("createKeyBroker", () => {
	it("names every variable tried when a key is missing", () => {
		const broker = createKeyBroker({ ANTHROPIC_API_KEY: OTHER });
		expect(broker.missing("anthropic")).toEqual(["SWT_ANTHROPIC_API_KEY", "ARENA_ANTHROPIC_API_KEY"]);
		const error = caught(() => broker.auth("anthropic"));
		expect(error.code).toBe("SWT-X001");
		expect(error.message).toContain("SWT_ANTHROPIC_API_KEY");
		expect(error.message).toContain("ARENA_ANTHROPIC_API_KEY");
		expect(error.message).not.toContain(OTHER);
		expect(caught(() => broker.auth("nobody")).code).toBe("SWT-X001");
		expect(createKeyBroker({ SWT_OPENROUTER_API_KEY: "" }).missing("openrouter")).toHaveLength(2);
	});

	it("lets the SWT_ name win over the fallback, and finds the fallback alone", async () => {
		const broker = createKeyBroker(ENV);
		expect(broker.missing("anthropic")).toEqual([]);
		expect(await keyOf(broker.auth("anthropic"))).toBe(SHAPED);
		expect(await keyOf(broker.auth("openrouter"))).toBe(PLAIN);
		expect(await keyOf(createKeyBroker({ ARENA_ANTHROPIC_API_KEY: OTHER }).auth("anthropic"))).toBe(OTHER);
		const auth = broker.auth("anthropic");
		expect(Object.keys(auth).sort()).toEqual(["name", "resolve"]);
		expect(JSON.stringify(auth) + inspect(auth, { depth: 9, showHidden: true })).not.toContain(SHAPED);
	});

	it("refuses a short value with SWT-X006 and does not fall through to the second name", () => {
		const short = "x".repeat(15);
		const error = caught(() => createKeyBroker({ SWT_ANTHROPIC_API_KEY: short, ARENA_ANTHROPIC_API_KEY: OTHER, OPENROUTER_API_KEY: PLAIN }));
		expect(error.code).toBe("SWT-X006");
		expect(error.message).toContain("SWT_ANTHROPIC_API_KEY");
		expect(JSON.stringify(error.issues)).not.toContain(short);
		expect(createKeyBroker({ SWT_ANTHROPIC_API_KEY: "x".repeat(16) }).missing("anthropic")).toEqual([]);
	});

	it("redacts a held value in a text and inside JSON, and the patterns of contracts", () => {
		const broker = createKeyBroker(ENV);
		const line = JSON.stringify({ detail: `401 for ${PLAIN}`, nested: [{ header: `x-api-key: ${SHAPED}` }], url: "https://user:pass@host/v1" });
		const redacted = broker.redact(line);
		for (const value of [SHAPED, PLAIN, "pass"]) expect(redacted).not.toContain(value);
		expect(JSON.parse(redacted)).toEqual({ detail: "401 for [redacted]", nested: [{ header: `x-api-key: ${["s", "k"].join("")}-[redacted]` }], url: "https://[redacted]@host/v1" });
		expect(broker.redact(`${PLAIN}${PLAIN}`)).toBe("[redacted][redacted]");
		// The fallback's value is not held when the first name is set.
		expect(broker.redact(OTHER)).toBe(OTHER);
		expect(broker.redact("nothing to hide")).toBe("nothing to hide");
	});

	it("finds a leak as it is, base64, base64url and percent-encoded, and answers a boolean only", () => {
		const broker = createKeyBroker(ENV);
		const base64 = Buffer.from(PLAIN).toString("base64");
		const forms = [PLAIN, base64, base64.replace(/=+$/, ""), Buffer.from(PLAIN).toString("base64url"), encodeURIComponent(PLAIN), encodeURIComponent(PLAIN).toLowerCase(), SHAPED, Buffer.from(SHAPED).toString("base64")];
		expect(encodeURIComponent(PLAIN)).not.toBe(PLAIN);
		for (const form of forms) expect(broker.leaks(`before ${form} after`)).toBe(true);
		expect(broker.leaks(`${OTHER} ${PLAIN.slice(0, -1)} ${base64.slice(1, -6)}`)).toBe(false);
		expect(broker.leaks("")).toBe(false);
		expect(createKeyBroker({}).leaks(PLAIN)).toBe(false);
	});

	it("has no function and no property that returns a value, and shows none", () => {
		const broker = createKeyBroker(ENV);
		expect(Object.isFrozen(broker)).toBe(true);
		const shown = [JSON.stringify(broker), JSON.stringify({ broker }), String(broker), `${broker.toString()}!`, inspect(broker, { depth: 9, showHidden: true, getters: true }), inspect({ broker })];
		for (const key of Reflect.ownKeys(broker)) {
			const member: unknown = Reflect.get(broker, key);
			shown.push(String(key), typeof member === "function" ? String(member) : JSON.stringify(member));
			if (typeof member !== "function" || key === "auth") continue;
			for (const argument of ["anthropic", "openrouter", ...VALUES]) {
				const answer: unknown = Reflect.apply(member, broker, [argument]);
				shown.push(inspect(answer, { depth: 9 }));
			}
		}
		expect(shown).toHaveLength(6 + 2 * 7 + 6 * 5);
		// `redact` and `leaks` were handed the values: what comes back holds none either.
		for (const text of shown) for (const value of VALUES.slice(0, 2)) expect(text).not.toContain(value);
		expect(JSON.stringify(broker)).toBe('"[KeyBroker]"');
		expect(String(broker)).toBe("[KeyBroker]");
		expect(inspect(broker)).toBe("[KeyBroker]");
	});
});

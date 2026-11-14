// SPDX-License-Identifier: Apache-2.0
/** The redaction patterns carried from the old platform, and the two helpers around a redact function. */
import { describe, expect, it } from "vitest";
import { redactSecrets, redactValue, redactWith } from "../src/index.ts";

// Built at run time: no committed text has the shape of a key.
const KEY = `${["s", "k"].join("")}-ant-${"a1B2_c3-".repeat(4)}`;
const TOKEN = "t0K.en~".repeat(4);

describe("redactSecrets", () => {
	it("takes out URL credentials, sk- keys and bearer tokens, and keeps the text around them", () => {
		expect(redactSecrets(`fetch https://user:${TOKEN}@api.example/v1 failed`)).toBe("fetch https://[redacted]@api.example/v1 failed");
		expect(redactSecrets(`postgres://${TOKEN}@db/x and ws://a:b@h`)).toBe("postgres://[redacted]@db/x and ws://[redacted]@h");
		expect(redactSecrets(`invalid x-api-key ${KEY}.`)).toBe("invalid x-api-key sk-[redacted].");
		expect(redactSecrets(`Authorization: Bearer ${TOKEN}, retry`)).toBe("Authorization: Bearer [redacted], retry");
		expect(redactSecrets(`${KEY} ${KEY}`)).toBe("sk-[redacted] sk-[redacted]");
	});

	it("leaves ordinary text as it is", () => {
		for (const text of ["", "cell is taken", "see https://example.org/a@b", "mail a@b.example", "task-list sk-short", "the bearer of news", "Bearer short"]) expect(redactSecrets(text)).toBe(text);
	});
});

describe("redactValue", () => {
	it("redacts every string value at any depth, not the keys, and does not change the value given", () => {
		const value = { [KEY]: KEY, list: [KEY, 1, null, { deep: `Bearer ${TOKEN}` }], flag: true, n: 2 };
		const copy = JSON.stringify(value);
		expect(redactValue(value, redactSecrets)).toEqual({ [KEY]: "sk-[redacted]", list: ["sk-[redacted]", 1, null, { deep: "Bearer [redacted]" }], flag: true, n: 2 });
		expect(JSON.stringify(value)).toBe(copy);
		expect(redactValue(KEY, redactSecrets)).toBe("sk-[redacted]");
	});

	it("returns what is no JSON value as it is, so the writer of a log still refuses it", () => {
		const when = new Date(0);
		expect(redactValue({ when, none: undefined }, redactSecrets)).toEqual({ when, none: undefined });
		expect(redactValue({ when }, redactSecrets).when).toBe(when);
	});
});

describe("redactWith", () => {
	it("applies the first function, then the second", () => {
		const held = "plain-value-no-pattern";
		const both = redactWith(redactSecrets, (text) => text.replaceAll(held, "[redacted]"));
		expect(both(`${KEY} and ${held}`)).toBe("sk-[redacted] and [redacted]");
		expect(redactWith((text) => `${text}a`, (text) => `${text}b`)("")).toBe("ab");
	});
});

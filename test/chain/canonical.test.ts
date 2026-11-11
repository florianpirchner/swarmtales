import { describe, expect, it } from "vitest";
import { canonicalJson, CanonicalJsonError, iJsonIssue, wellFormed } from "@swarmtales/chain";

describe("canonical JSON (RFC 8785)", () => {
	it("matches the RFC's example of numbers, strings and literals (§3.2.2)", () => {
		// Built from char codes so no escape in this file is decoded twice: BS is a backslash, the input string is
		// euro, $, U+000F, newline, A, ', B, ", backslash, backslash, ", /.
		const BS = String.fromCharCode(92);
		const text = `${String.fromCharCode(0x20ac)}$${String.fromCharCode(0x0f)}${String.fromCharCode(0x0a)}A'B"${BS}${BS}"/`;
		const value: unknown = JSON.parse(`{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],"string":${JSON.stringify(text)},"literals":[null,true,false]}`);
		const expected = `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"${String.fromCharCode(0x20ac)}$${BS}u000f${BS}nA'B${BS}"${BS}${BS}${BS}${BS}${BS}"/"}`;
		expect(canonicalJson(value)).toBe(expected);
	});

	it("sorts keys by UTF-16 code units, recursively (§3.2.3)", () => {
		const key = (...codes: number[]): string => String.fromCharCode(...codes);
		const value: unknown = Object.fromEntries([[key(0x20ac), "Euro Sign"], [key(0x0d), "Carriage Return"], [key(0xfb33), "Hebrew Letter Dalet With Dagesh"], ["1", "One"], [key(0xd83d, 0xde00), "Emoji: Grinning Face"], [key(0x80), "Control"], [key(0xf6), "Latin Small Letter O With Diaeresis"]]);
		// The RFC's order: CR, 1, U+0080, o-umlaut, euro, emoji, dalet (a JS object would list the integer key "1" first).
		const values = [...canonicalJson(value).matchAll(/:"([^"]+)"/g)].map((match) => match[1]);
		expect(values).toEqual(["Carriage Return", "One", "Control", "Latin Small Letter O With Diaeresis", "Euro Sign", "Emoji: Grinning Face", "Hebrew Letter Dalet With Dagesh"]);
		expect(canonicalJson({ b: { d: 1, c: [{ z: 0, a: 1 }] }, a: 2 })).toBe('{"a":2,"b":{"c":[{"a":1,"z":0}],"d":1}}');
	});

	it("is the same for the same value whatever the key order and whitespace", () => {
		const one: unknown = JSON.parse('{ "seq": 1, "type": "text", "agent": "A01", "text": "hi" }');
		const two: unknown = JSON.parse('{"text":"hi","agent":"A01","type":"text","seq":1}');
		expect(canonicalJson(one)).toBe(canonicalJson(two));
		expect(canonicalJson(-0)).toBe("0");
	});

	it("refuses what is not JSON", () => {
		expect(() => canonicalJson(Number.NaN)).toThrow(CanonicalJsonError);
		expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow(CanonicalJsonError);
		expect(() => canonicalJson(undefined)).toThrow(CanonicalJsonError);
		expect(() => canonicalJson({ a: undefined })).toThrow(CanonicalJsonError);
		expect(() => canonicalJson(1n)).toThrow(CanonicalJsonError);
	});

	it("tells what is not I-JSON: duplicate keys in any object, lone surrogates in keys and values (RFC 7493)", () => {
		const issue = (text: string): string | undefined => iJsonIssue(text, JSON.parse(text));
		expect(issue(String.raw`{"a":1,"b":[{"a":2,"c":"}{\"a\":"},{"a":3}],"d":{"a":4}}`)).toBeUndefined();
		expect(issue('{"a":1,"b":{"x":1,"y":{"x":2}},"a":2}')).toBe('duplicate key "a"');
		expect(issue('[{"x":1},{"y":{"z":1,"z":2}}]')).toBe('duplicate key "z"');
		expect(issue(String.raw`{"t":1,"t":2}`)).toBe('duplicate key "t"');
		expect(issue(String.raw`{"text":"😀"}`)).toBeUndefined();
		expect(issue(String.raw`{"text":"\ud83d"}`)).toBe("a lone surrogate in a string");
		expect(issue(String.raw`{"\udc00":1}`)).toBe("a lone surrogate in a string");
		expect(wellFormed(`a${"😀".slice(0, 1)}😀`)).toBe("a�😀");
	});
});

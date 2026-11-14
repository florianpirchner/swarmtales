// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { convertArguments } from "../src/mechanic/arguments.ts";

/** The cases of the old platform's `test/host/round2-core.test.ts` and `review-lifecycle.test.ts` (R2-D6), on the function itself. */
describe("convertArguments, as the old runner gave a tool its arguments", () => {
	const claim = Type.Object({ n: Type.Integer(), note: Type.Optional(Type.String()) });

	it("converts 1.5 to 1 and '3' to 3 and drops an optional null", () => {
		expect(convertArguments(claim, { n: 1.5 })).toEqual({ n: 1 });
		expect(convertArguments(claim, { n: "3", note: null })).toEqual({ n: 3 });
		expect(convertArguments(claim, { n: "3", note: null })).not.toHaveProperty("note");
	});

	it("leaves what cannot be converted, so the check after it refuses the call", () => {
		expect(Check(claim, convertArguments(claim, { n: "x" }))).toBe(false);
		const note = Type.Object({ text: Type.String() });
		expect(convertArguments(note, { text: 1 })).toEqual({ text: "1" });
		expect(Check(note, convertArguments(note, { text: { bad: true } }))).toBe(false);
	});

	it("keeps a null the schema allows, a required null and an unknown property", () => {
		const schema = Type.Object({ a: Type.Optional(Type.Union([Type.String(), Type.Null()])), b: Type.String() });
		// What the conversion makes of the required null is the converter's business; the key stays.
		const converted = convertArguments(schema, { a: null, b: null, c: null });
		expect(converted).toMatchObject({ a: null, c: null });
		expect(converted).toHaveProperty("b");
	});

	it("drops optional nulls inside lists and nested objects, and does not change what it was given", () => {
		const schema = Type.Object({ moves: Type.Array(Type.Object({ cell: Type.Integer(), why: Type.Optional(Type.String()) })) });
		const raw = { moves: [{ cell: "4", why: null }] };
		expect(convertArguments(schema, raw)).toEqual({ moves: [{ cell: 4 }] });
		expect(raw).toEqual({ moves: [{ cell: "4", why: null }] });
	});
});

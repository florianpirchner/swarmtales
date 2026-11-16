// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The reading of a Director's answer text (decision A100, P480): the whole text, else the last object that the
 * schema of the output accepts. The three logged cases are answers of the guard in `whispers/smoke/whispers-001`
 * (branch `data/runs`), each read as `invalid` under runtime revision 6; the schema is the guard's answer schema
 * (`GuardAnswer` of `mechanics/city-directors`, which this package may not import), field for field.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { readAnswer } from "../src/answer.ts";

const GuardAnswer = Type.Object(
	{
		allowed: Type.Boolean({ description: "true when the message keeps the rule, false when it breaks it" }),
		reason: Type.String({ minLength: 1, maxLength: 300, description: "One short sentence for the author; never a secret" }),
	},
	{ description: "Record whether the message keeps the city's rule, and why." },
);

const Logged = Type.Object(
	{
		description: Type.String({ description: "Where the answers come from" }),
		answers: Type.Object(
			{
				"#68": Type.String({ description: "The schema written back, then the verdict" }),
				"#3793": Type.String({ description: "A first verdict, reasoning, then a second verdict" }),
				"#5356": Type.String({ description: "The schema written back without its description, then the verdict" }),
			},
			{ description: "Answer texts by log line" },
		),
	},
	{ description: "Logged answer texts of the guard" },
);
const logged = Parse(Logged, JSON.parse(readFileSync(new URL("fixtures/guard-answers.json", import.meta.url), "utf8"))).answers;

describe("the reading of an answer text", () => {
	it.each([
		["#68", { allowed: true, reason: 'The proposed group name "Password Circle" contains no fragment, seam or sequence copied from your held secret.' }],
		["#3793", { allowed: true, reason: "The message describes receiving and sending a piece without quoting any fragment or character sequence from a password." }],
		["#5356", { allowed: false, reason: "The message refers to a held door 4 piece as already shared, which hints at password material you keep private." }],
	] as const)("reads the logged guard answer %s as its final verdict", (line, verdict) => {
		expect(readAnswer(logged[line], GuardAnswer)).toEqual({ ok: true, value: verdict });
	});

	it("reads the whole text first, also inside a code fence, and a value that is no object", () => {
		expect(readAnswer('```json\n{"allowed":false,"reason":"A seam."}\n```', GuardAnswer)).toEqual({ ok: true, value: { allowed: false, reason: "A seam." } });
		expect(readAnswer("[1,2]", Type.Array(Type.Number(), { description: "Numbers" }))).toEqual({ ok: true, value: [1, 2] });
		expect(readAnswer("plain", "no schema")).toEqual({ ok: false, detail: "the answer is no JSON, or its schema cannot be checked" });
	});

	it("takes the last object that fits, whatever stands after it, and skips braces inside strings", () => {
		const first = '{"allowed":true,"reason":"Fine {so far}."}';
		const last = '{"allowed":false,"reason":"It quotes \\"85PU2\\" } as a piece."}';
		expect(readAnswer(`${first}\nOn second thought:\n${last}\nThe schema was ${JSON.stringify(GuardAnswer)}`, GuardAnswer)).toEqual({ ok: true, value: { allowed: false, reason: 'It quotes "85PU2" } as a piece.' } });
	});

	it("takes an object that fits whole and does not read the objects inside it", () => {
		const Wrapper = Type.Object({ verdict: Type.Optional(GuardAnswer) }, { description: "Anything with an optional verdict" });
		const text = 'Answer: {"verdict":{"allowed":false,"reason":"Inner."}} done';
		expect(readAnswer(text, Wrapper)).toEqual({ ok: true, value: { verdict: { allowed: false, reason: "Inner." } } });
	});

	it("is `invalid` with the detail of the whole text when no object fits", () => {
		expect(readAnswer("I say: order.", GuardAnswer)).toEqual({ ok: false, detail: "the answer is no JSON, or its schema cannot be checked" });
		expect(readAnswer('{"allowed":"yes","reason":"x"}', GuardAnswer)).toEqual({ ok: false, detail: "the answer does not fit the schema of the output" });
		expect(readAnswer(`${JSON.stringify(GuardAnswer)}\n\nThe verdict: {"allowed":true,"reason":""}`, GuardAnswer)).toEqual({ ok: false, detail: "the answer is no JSON, or its schema cannot be checked" });
		expect(readAnswer('Cut short: {"allowed":true,"reason":"No', GuardAnswer)).toMatchObject({ ok: false });
	});
});

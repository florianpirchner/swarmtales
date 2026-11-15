// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { inSchemaOrder } from "../src/mechanic/schema-order.ts";

const Card = Type.Object({ word: Type.String(), owner: Type.String(), by: Type.Union([Type.String(), Type.Null()]) }, { description: "A card." });
const State = Type.Object(
	{
		round: Type.Integer(),
		grid: Type.Array(Card),
		clue: Type.Union([Type.Object({ word: Type.String(), number: Type.Integer() }), Type.Null()]),
		pair: Type.Tuple([Card, Type.Object({ z: Type.Integer(), a: Type.Integer() })]),
		scores: Type.Record(Type.String(), Type.Object({ won: Type.Integer(), lost: Type.Integer() })),
		note: Type.Optional(Type.String()),
		extra: Type.Unknown(),
	},
	{ description: "A state." },
);
// A copy with the keys of every object sorted, as a snapshot file gives a state back.
function sorted(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value, (_key, inner: unknown) => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1))) : inner)));
}
const card = (word: string, by: string | null): { word: string; owner: string; by: string | null } => ({ word, owner: "amber", by });
const state = { round: 2, grid: [card("fox", null)], clue: { word: "den", number: 2 }, pair: [card("owl", "ada"), { z: 1, a: 2 }], scores: { teal: { won: 1, lost: 0 }, amber: { won: 0, lost: 1 } }, extra: { y: 1, b: [{ q: 1, c: 2 }] } };

describe("inSchemaOrder: a loaded state in the key order of its schema (A43)", () => {
	it("rebuilds objects, arrays, tuples, union variants and the values of a record; the keys of a record and of an unknown stay as given", () => {
		const loaded = Parse(State, sorted(state));
		expect(JSON.stringify(loaded)).not.toBe(JSON.stringify(state));
		expect(JSON.stringify(inSchemaOrder(State, loaded))).toBe(JSON.stringify({ ...state, scores: { amber: { won: 0, lost: 1 }, teal: { won: 1, lost: 0 } }, extra: { b: [{ c: 2, q: 1 }], y: 1 } }));
	});

	it("is a copy: the given value is not changed and shares no object with the result", () => {
		const loaded = Parse(State, sorted({ ...state, clue: null, note: "x" }));
		const before = JSON.stringify(loaded);
		const ordered = inSchemaOrder(State, loaded);
		expect(JSON.stringify(loaded)).toBe(before);
		expect(ordered).toEqual(loaded);
		expect(ordered.grid).not.toBe(loaded.grid);
		expect(ordered.extra).not.toBe(loaded.extra);
		expect(Object.keys(ordered)).toEqual(["round", "grid", "clue", "pair", "scores", "note", "extra"]);
	});
});

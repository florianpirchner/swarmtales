// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, expectTypeOf, it } from "vitest";
import { defineEvents, defineService, defineTool, refuse, reply } from "../src/mechanic/definers.ts";

describe("definers", () => {
	it("defineService returns the contract with literal types", () => {
		const contract = { name: "board", summary: "The board.", methods: { cells: { kind: "query", summary: "Every cell.", input: Type.Object({}), output: Type.Array(Type.String()) } } } as const;
		const Board = defineService(contract);
		expect(Board).toBe(contract);
		expectTypeOf(Board.name).toEqualTypeOf<"board">();
		expectTypeOf(Board.methods.cells.kind).toEqualTypeOf<"query">();
	});

	it("defineEvents and defineTool pair the name with the schemas", () => {
		const moved = Type.Object({ cell: Type.Integer() });
		const events = defineEvents("grid-game", { moved });
		expect(events).toEqual({ id: "grid-game", events: { moved } });
		expectTypeOf(events.id).toEqualTypeOf<"grid-game">();
		const tool = defineTool("playMove", moved);
		expect(tool).toEqual({ name: "playMove", parameters: moved });
		expect(tool.parameters).toBe(moved);
		expectTypeOf(tool.name).toEqualTypeOf<"playMove">();
	});

	it("reply and refuse leave out what was not given, as the old platform did", () => {
		expect(reply("done")).toEqual({ ok: true, reply: "done" });
		expect(reply("done", { endsTurn: false })).toEqual({ ok: true, reply: "done" });
		expect(Object.keys(reply("done", {}))).toEqual(["ok", "reply"]);
		expect(reply("done", { endsTurn: true })).toEqual({ ok: true, reply: "done", endsTurn: true });
		expect(refuse("NOT_YOUR_TURN")).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
		expect(Object.keys(refuse("NOT_YOUR_TURN"))).toEqual(["ok", "code"]);
		expect(refuse("NOT_YOUR_TURN", "Wait for O.")).toEqual({ ok: false, code: "NOT_YOUR_TURN", detail: "Wait for O." });
	});
});

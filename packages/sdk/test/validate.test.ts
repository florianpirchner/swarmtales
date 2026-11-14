// SPDX-License-Identifier: Apache-2.0
import { SwtError, type GameData, type SwtIssue } from "@swarmtales/contracts";
import { Type, type TSchema } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { optionMismatch } from "../src/errors.ts";
import { actorsOf, checkSchema, mechanicsOf, residentsOf } from "../src/game/validate.ts";
import type { MechanicDefinition } from "../src/mechanic/types.ts";

const SizeOptions = Type.Object({ size: Type.Integer({ default: 3, minimum: 2, description: "The size" }) }, { additionalProperties: false, description: "The options" });

/** A stand-in definition: what step 4 reads of one (`id`, `package`, `events`, `parseOptions`). */
function standIn(id: string, events: Readonly<Record<string, TSchema>> = {}): MechanicDefinition {
	const head = { id, package: `@test/${id}`, summary: id, options: SizeOptions, state: undefined, version: 1, events, audiences: {}, prompts: {}, requires: [], provides: [], uses: [], tools: [] };
	const definition: MechanicDefinition = Object.assign((options?: unknown) => ({ mechanic: definition, options }), {
		id,
		package: head.package,
		source: `${head.package}/${id}`,
		options: SizeOptions,
		events,
		head,
		parseOptions: (raw: unknown): unknown => {
			const filled = Value.Default(SizeOptions, Value.Clone(raw ?? {}));
			const wrong = Value.Errors(SizeOptions, filled)[0];
			if (wrong !== undefined) throw new SwtError(optionMismatch({ owner: id, package: head.package, path: `options${wrong.instancePath.replace("/", ".")}`, message: wrong.message }));
			return filled;
		},
		resolve: () => {
			throw new Error("not resolved in this test");
		},
	});
	return definition;
}

const game = (changes: Partial<GameData> = {}): GameData => ({ schema: 1, id: "demo", residents: ["A", "B", "C"], mechanics: [], end: { ticks: 3 }, ...changes });
const brief = (issues: readonly SwtIssue[]): readonly string[] => issues.map((issue) => `${issue.code} ${issue.where?.path ?? "-"}`);
const marks = standIn("marks", { marks_spent: Type.Object({}, { description: "Spent" }) });
const board = standIn("board", { board_changed: Type.Object({}, { description: "Changed" }) });

describe("step 1, the schema", () => {
	it("gives a matching game back", () => {
		const data = game({ teams: { X: ["A"] }, mechanics: [{ use: "marks" }] });
		expect(checkSchema(data)).toEqual({ data, issues: [] });
	});

	it("reports every mismatch as SWT-G001 with its data path, an unknown field and a union once", () => {
		const { data, issues } = checkSchema({ schema: 1, id: "demo", residents: 0, mechanics: [], colour: "red", teams: { X: [7] } });
		expect(data).toBeUndefined();
		expect(brief(issues)).toEqual(["SWT-G001 -", "SWT-G001 colour", "SWT-G001 residents", "SWT-G001 teams.X[0]"]);
		expect(issues.map((issue) => issue.summary)).toEqual([
			"the game must have required properties end",
			"`colour` of the game is not a field of the format",
			"`residents` of the game matches none of the forms the format allows",
			"`teams.X[0]` of the game must be string",
		]);
		expect(brief(checkSchema("a game").issues)).toEqual(["SWT-G001 -"]);
	});

	it("reports another schema version as SWT-G002 alone", () => {
		expect(brief(checkSchema({ ...game(), schema: 2, colour: "red" }).issues)).toEqual(["SWT-G002 schema"]);
	});

	it("reports Directors as SWT-G003 and a malformed resident id as SWT-G010, each once", () => {
		const { data, issues } = checkSchema({ ...game(), directors: [{ id: "host" }], residents: ["A", "B 2"] });
		expect(data).toBeUndefined();
		expect(brief(issues)).toEqual(["SWT-G003 directors", "SWT-G010 residents[1]"]);
		expect(issues[1]?.summary).toBe('resident id "B 2" is malformed');
	});
});

describe("steps 2 and 3, residents, teams and roles", () => {
	it("turns a count into A01.. with the width of the old platform", () => {
		expect(residentsOf(game({ residents: 3 }))).toEqual({ ids: ["A01", "A02", "A03"], issues: [] });
		expect(residentsOf(game({ residents: 120 })).ids.slice(98, 100)).toEqual(["A099", "A100"]);
	});

	it("reports a doubled id as SWT-G010 and keeps the first", () => {
		const { ids, issues } = residentsOf(game({ residents: ["A", "B", "A"] }));
		expect(ids).toEqual(["A", "B"]);
		expect(brief(issues)).toEqual(["SWT-G010 residents[2]"]);
	});

	it("makes each resident an actor and writes team and role into `shared`", () => {
		const { actors, issues } = actorsOf(game({ teams: { X: ["A", "C"], O: ["B", "A"] }, roles: { scout: ["C"] } }), ["A", "B", "C"]);
		expect(issues).toEqual([]);
		expect(actors).toEqual([
			{ id: "resident:A", kind: "resident", grant: "resident", shared: { team: "X" } },
			{ id: "resident:B", kind: "resident", grant: "resident", shared: { team: "O" } },
			{ id: "resident:C", kind: "resident", grant: "resident", shared: { team: "X", role: "scout" } },
		]);
	});

	it("reports a member that is no resident as SWT-G011", () => {
		const { actors, issues } = actorsOf(game({ teams: { X: ["A", "D"] }, roles: { scout: ["E"] } }), ["A", "B", "C"]);
		expect(brief(issues)).toEqual(["SWT-G011 teams.X[1]", "SWT-G011 roles.scout[0]"]);
		expect(actors.map((actor) => actor.id)).toEqual(["resident:A", "resident:B", "resident:C"]);
	});
});

describe("step 4, the mechanics", () => {
	const definitions = { marks, board };

	it("finds each definition and parses its options with defaults", () => {
		const { used, issues } = mechanicsOf(game({ mechanics: [{ use: "board", options: { size: 4 }, as: { post: "say" } }, { use: "marks" }] }), definitions);
		expect(issues).toEqual([]);
		expect(used).toEqual([
			{ index: 0, definition: board, options: { size: 4 }, as: { post: "say" } },
			{ index: 1, definition: marks, options: { size: 3 }, as: {} },
		]);
	});

	it("reports a mechanic that is not installed as SWT-G022, with the closest id", () => {
		const { used, issues } = mechanicsOf(game({ mechanics: [{ use: "marks" }, { use: "bord" }, { use: "toString" }] }), definitions);
		expect(brief(issues)).toEqual(["SWT-G022 mechanics[1].use", "SWT-G022 mechanics[2].use"]);
		expect(issues[0]?.fix).toContain('did you mean "board"?');
		expect(used.map((entry) => entry.index)).toEqual([0]);
	});

	it("reports a mechanic that is listed twice as SWT-G021 and keeps the first", () => {
		const { used, issues } = mechanicsOf(game({ mechanics: [{ use: "marks" }, { use: "board" }, { use: "marks", options: { size: 5 } }] }), definitions);
		expect(brief(issues)).toEqual(["SWT-G021 mechanics[2]"]);
		expect(used.map((entry) => entry.options)).toEqual([{ size: 3 }, { size: 3 }]);
	});

	it("reports options that do not parse as SWT-G020 under the path of the use, and goes on", () => {
		const { used, issues } = mechanicsOf(game({ mechanics: [{ use: "marks" }, { use: "board", options: { size: "big" } }] }), definitions);
		expect(brief(issues)).toEqual(["SWT-G020 mechanics[1].options.size"]);
		expect(issues[0]?.where?.package).toBe("@test/board");
		expect(used.map((entry) => entry.options)).toEqual([{ size: 3 }, undefined]);
	});

	it("passes on what a parser throws that is no SwtError", () => {
		const broken = Object.assign(standIn("broken"), { parseOptions: () => { throw new TypeError("a bug"); } });
		expect(() => mechanicsOf(game({ mechanics: [{ use: "broken" }] }), { broken })).toThrow(TypeError);
	});

	it("reports an event type of the kernel or of an earlier mechanic as SWT-M010", () => {
		const clash = standIn("clash", { run_ended: Type.Object({}, { description: "Ended" }), marks_spent: Type.Object({}, { description: "Spent" }), clash_own: Type.Object({}, { description: "Own" }) });
		const { issues } = mechanicsOf(game({ mechanics: [{ use: "marks" }, { use: "clash" }] }), { marks, clash });
		expect(issues.map((issue) => issue.code)).toEqual(["SWT-M010", "SWT-M010"]);
		expect(issues.map((issue) => issue.summary)).toEqual([
			'mechanic "clash" declares the event "run_ended", which is reserved by the kernel',
			'mechanic "clash" declares the event "marks_spent", which is declared by the mechanic "marks" too',
		]);
	});
});

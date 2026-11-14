// SPDX-License-Identifier: Apache-2.0
import { SwtError, type GameData, type PromptLookup, type SchedulerDefinition, type ServiceDefinition } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Parse, Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { optionMismatch } from "../src/errors.ts";
import { defineGame } from "../src/game/define-game.ts";
import { resolveGame } from "../src/game/resolve.ts";
import type { ResolveInput } from "../src/game/types.ts";
import type { MechanicDefinition } from "../src/mechanic/types.ts";

const SizeOptions = Type.Object({ size: Type.Integer({ default: 3, minimum: 2, description: "The size" }) }, { description: "The options" });
const TurnsOptions = Type.Object({ passes: Type.Integer({ minimum: 1, default: 1, description: "Passes" }), order: Type.Union([Type.Literal("seeded"), Type.Literal("roster")], { default: "seeded", description: "Order" }) }, { description: "Turns" });
const service = (name: string): ServiceDefinition => ({ name, summary: name, methods: {} });

interface Parts {
	readonly tools?: readonly string[];
	readonly requires?: readonly string[];
	readonly provides?: readonly string[];
	readonly prompts?: Readonly<Record<string, readonly string[]>>;
}

/** A stand-in for what `defineMechanic` (issue 26) returns: a head, `parseOptions` and a `resolve` that builds no instance. */
function standIn(id: string, parts: Parts = {}): MechanicDefinition {
	const tools = (parts.tools ?? []).map((name) => ({ name, description: `The tool ${name}.`, parameters: Type.Object({}, { description: "None" }), for: ["resident"], free: false }));
	const requires = (parts.requires ?? []).map(service);
	const provides = (parts.provides ?? []).map(service);
	const head = { id, package: `@test/${id}`, summary: id, options: SizeOptions, state: undefined, version: 1, events: {}, audiences: {}, prompts: parts.prompts ?? {}, requires, provides, uses: [], tools, metrics: [] };
	const definition: MechanicDefinition = Object.assign((options?: unknown) => ({ mechanic: definition, options }), {
		id,
		package: head.package,
		source: `${head.package}/${id}`,
		options: SizeOptions,
		events: {},
		head,
		parseOptions: (raw: unknown): unknown => {
			const filled = Value.Default(SizeOptions, Value.Clone(raw ?? {}));
			const wrong = Value.Errors(SizeOptions, filled)[0];
			if (wrong !== undefined) throw new SwtError(optionMismatch({ owner: id, package: head.package, path: `options${wrong.instancePath.replace("/", ".")}`, message: wrong.message }));
			return filled;
		},
		resolve: (options: unknown, _texts: PromptLookup, version: string) => ({
			id,
			package: head.package,
			version,
			requires: requires.map((need) => need.name),
			provides: provides.map((given) => given.name),
			events: {},
			audiences: {},
			options: Value.Check(SizeOptions, options) ? options : null,
			create: () => {
				throw new TypeError("resolution creates no instance");
			},
		}),
	});
	return definition;
}

const turns: SchedulerDefinition = { id: "@test/turns", revision: 1, determinism: "seeded", options: TurnsOptions, events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) };
const prompts: PromptLookup = {
	render: (owner, id) => {
		if (id === "absent") throw new SwtError({ code: "SWT-P010", summary: "no file", why: "w", fix: "f" });
		return `${owner}: ${id}`;
	},
};
const board = standIn("board", { tools: ["move", "look"], provides: ["grid"], prompts: { rules: ["size"] } });
const chat = standIn("chat", { tools: ["post"], requires: ["grid"] });
const input = (game: ResolveInput["game"], more: Partial<ResolveInput> = {}): ResolveInput => ({ game, schedulers: { turns }, prompts, ...more });
const data = (changes: Partial<GameData> = {}): GameData => ({ schema: 1, id: "demo", residents: 2, mechanics: [{ use: "chat" }, { use: "board" }], end: { ticks: 5 }, ...changes });
const installed = { board, chat };
const failure = (run: () => unknown): readonly string[] => {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error.issues.map((issue) => `${issue.code} ${issue.where?.path ?? "-"}`);
		throw error;
	}
	return ["no error"];
};

describe("resolveGame", () => {
	it("builds the kernel definition of a builder game: load order, roster last, names, grants, locks, replies, limits", () => {
		const game = defineGame({ id: "demo", residents: 2, teams: { X: ["A01"] }, mechanics: [chat(), board({ size: 4 })], locked: ["post"], limits: { maxCallsPerTick: 7 }, end: { ticks: 5 }, win: { fact: "board.winner" }, briefing: { A02: "You are O." } });
		const { definition, data: filled, texts, briefings, win } = resolveGame(input(game, { seed: 9, versions: { "@test/board": "1.2.3", "@swarmtales/sdk": "0.4.0" } }));
		expect(definition.plugins.map((plugin) => `${plugin.id}@${plugin.version}`)).toEqual(["board@1.2.3", "chat@0.0.0", "roster@0.4.0"]);
		expect(definition.plugins[0]?.options).toEqual({ size: 4 });
		expect(definition.actors).toEqual([{ id: "resident:A01", kind: "resident", grant: "resident", shared: { team: "X" } }, { id: "resident:A02", kind: "resident", grant: "resident", shared: {} }]);
		expect(definition.grants).toEqual({ resident: ["@test/board/board/move", "@test/board/board/look", "@test/chat/chat/post"] });
		expect(definition.names["@test/chat/chat/post"]).toBe("post");
		expect(definition.startLocks).toEqual({ resident: ["@test/chat/chat/post"] });
		expect(definition.replies).toEqual({ TOOL_UNKNOWN: "kernel: replies/core/unknown-tool", TOOL_NOT_GRANTED: "kernel: replies/core/not-granted", TOOL_LOCKED: "kernel: replies/core/locked", STEP_LIMIT: "kernel: replies/core/steps" });
		expect(definition.scheduler).toEqual({ definition: turns, options: { passes: 1, order: "seeded" } });
		expect([definition.seed, definition.limits, definition.game.id]).toEqual([9, { maxTicks: 5, maxCallsPerTick: 7 }, "demo"]);
		expect(filled.mechanics).toEqual([{ use: "chat", options: { size: 3 } }, { use: "board", options: { size: 4 } }, { use: "roster" }]);
		expect([filled.seed, filled.scheduler]).toEqual([1, { id: "turns", options: { passes: 1, order: "seeded" } }]);
		expect(texts).toMatchObject({ "board/rules": "board: rules", "board/tools/move": "The tool move.", "chat/tools/post": "The tool post.", "kernel/replies/core/locked": "kernel: replies/core/locked" });
		expect([briefings, win]).toEqual([{ "resident:A02": "You are O." }, "board.winner"]);
	});

	it("hashes the data form: one option changes the hash, the seed of the run does not, and the recorded data resolves to itself", () => {
		const first = resolveGame(input(data(), { installed }));
		expect(first.definition.game.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(resolveGame(input(data({ mechanics: [{ use: "chat" }, { use: "board", options: { size: 4 } }] }), { installed })).definition.game.hash).not.toBe(first.definition.game.hash);
		expect(resolveGame(input(data({ scheduler: { id: "turns", options: { passes: 2 } } }), { installed })).definition.game.hash).not.toBe(first.definition.game.hash);
		expect(resolveGame(input(data(), { installed, seed: 4 })).definition.game.hash).toBe(first.definition.game.hash);
		const again = resolveGame(input(first.data, { installed }));
		expect(again.data).toEqual(first.data);
		expect(again.definition.plugins.map((plugin) => plugin.id)).toEqual(["board", "chat", "roster"]);
		expect([first.definition.seed, resolveGame(input(data({ seed: 6 }), { installed })).definition.seed, resolveGame(input(data({ briefing: "Play." }), { installed })).briefings]).toEqual([1, 6, { "resident:A01": "Play.", "resident:A02": "Play." }]);
	});

	it("appends no roster when a mechanic provides it", () => {
		const resolved = resolveGame(input(data({ mechanics: [{ use: "own" }] }), { installed: { own: standIn("own", { provides: ["roster"] }) } }));
		expect(resolved.definition.plugins.map((plugin) => plugin.id)).toEqual(["own"]);
		expect(resolved.data.mechanics).toEqual([{ use: "own", options: { size: 3 } }]);
	});

	it("throws one error with every issue of every step, sorted by data path", () => {
		const broken = data({
			residents: ["A", "B", "A"],
			teams: { X: ["Z"] },
			mechanics: [{ use: "chat" }, { use: "bord" }, { use: "texts", options: { size: 1 } }, { use: "texts" }, { use: "texts2" }],
			grants: { resident: ["post", "mov"] },
			locked: ["lok"],
			scheduler: { id: "turns", options: { pases: 2, passes: 0 } },
		});
		const texts = { texts: standIn("texts"), texts2: standIn("texts2", { prompts: { absent: [] } }) };
		expect(failure(() => resolveGame(input(broken, { installed: { ...installed, ...texts } })))).toEqual([
			"SWT-G012 grants.resident[1]",
			"SWT-G012 locked[0]",
			"SWT-G030 mechanics[0]",
			"SWT-G022 mechanics[1].use",
			"SWT-G020 mechanics[2].options.size",
			"SWT-G021 mechanics[3]",
			"SWT-P003 mechanics[4]",
			"SWT-G010 residents[2]",
			"SWT-G020 scheduler.options.pases",
			"SWT-G020 scheduler.options.passes",
			"SWT-G011 teams.X[0]",
		]);
	});

	it("reports a game that fails its schema alone, and a scheduler that is not known or gets a wrong option", () => {
		expect(failure(() => resolveGame(input(Object.assign(data({ scheduler: { id: "none" } }), { schema: 2 }), { installed })))).toEqual(["SWT-G002 schema"]);
		expect(failure(() => resolveGame(input(data({ scheduler: { id: "none" } }), { installed })))).toEqual(["SWT-G020 scheduler.id"]);
		expect(failure(() => resolveGame(input(data({ scheduler: { id: "turns", options: { order: "random" } } }), { installed })))).toEqual(["SWT-G020 scheduler.options.order"]);
		expect(failure(() => resolveGame(input(data({ mechanics: [{ use: "roster" }, { use: "rooster" }] }), { installed })))).toEqual(["SWT-G022 mechanics[1].use"]);
	});

	// The findings of the M1 review of resolution; each case failed before its fix.
	describe("M1 review", () => {
		it("S1: finds a builder game's mechanic whose id is a name of Object.prototype", () => {
			for (const id of ["constructor", "toString", "valueOf", "__proto__"]) {
				const odd = standIn(id);
				expect(resolveGame(input(defineGame({ id: "demo", residents: 1, mechanics: [odd()], end: { ticks: 1 } }))).definition.plugins.map((plugin) => plugin.id)).toEqual([id, "roster"]);
			}
			const again = standIn("board");
			expect(failure(() => resolveGame(input(defineGame({ id: "demo", residents: 1, mechanics: [board(), again()], end: { ticks: 1 } }))))).toEqual(["SWT-G021 mechanics[1]"]);
		});

		it("S2: reports a game that is no object, or whose mechanics hold no definition, as SWT-G001 and not as a TypeError", () => {
			const untyped = (game: unknown): ResolveInput => ({ ...input(data()), ...Parse(Type.Object({ game: Type.Any() }), { game }) });
			expect(failure(() => resolveGame(untyped(null)))).toEqual(["SWT-G001 -"]);
			expect(failure(() => resolveGame(untyped(7)))).toEqual(["SWT-G001 -"]);
			expect(failure(() => resolveGame(untyped({ id: "demo", residents: 1, mechanics: [{ mechanic: undefined }], end: { ticks: 1 } })))[0]).toMatch(/^SWT-G001 /);
		});

		it("S3: refuses a seed of the run that is no 32-bit whole number, and takes the two bounds", () => {
			for (const seed of [-1, 1.5, 4294967296, Number.NaN]) expect(failure(() => resolveGame(input(data(), { installed, seed })))).toEqual(["SWT-G001 seed"]);
			expect([0, 4294967295].map((seed) => resolveGame(input(data(), { installed, seed })).definition.seed)).toEqual([0, 4294967295]);
		});

		it("S4: names a mechanic without a provider by its place in the game, also behind a use that was not found or is listed twice", () => {
			const game = data({ mechanics: [{ use: "ghost" }, { use: "board" }, { use: "board" }, { use: "needy" }] });
			expect(failure(() => resolveGame(input(game, { installed: { board, needy: standIn("needy", { requires: ["absent"] }) } })))).toEqual(["SWT-G022 mechanics[0].use", "SWT-G021 mechanics[2]", "SWT-G030 mechanics[3]"]);
		});

		it("S5: reports the scheduler option `__proto__` of a parsed game as unknown instead of dropping it", () => {
			const game = data({ scheduler: { id: "turns", options: JSON.parse('{"__proto__":{"passes":2},"constructor":1}') } });
			expect(failure(() => resolveGame(input(game, { installed })))).toEqual(["SWT-G020 scheduler.options.__proto__", "SWT-G020 scheduler.options.constructor"]);
		});

		it("S6: a mechanic that requires the service `roster` resolves, and `roster` loads before its first requirer", () => {
			const needy = standIn("needy", { requires: ["roster"] });
			const order = (game: GameData, mechanics: Readonly<Record<string, MechanicDefinition>>): readonly string[] => resolveGame(input(game, { installed: mechanics })).definition.plugins.map((plugin) => plugin.id);
			expect(order(data({ mechanics: [{ use: "needy" }] }), { needy })).toEqual(["roster", "needy"]);
			expect(order(data({ mechanics: [{ use: "board" }, { use: "needy" }, { use: "chat" }] }), { ...installed, needy })).toEqual(["board", "roster", "needy", "chat"]);
			// A listed provider of `roster` stands: the sdk adds none, and the requirer loads after it.
			const own = standIn("own", { provides: ["roster"] });
			expect(order(data({ mechanics: [{ use: "needy" }, { use: "own" }] }), { needy, own })).toEqual(["own", "needy"]);
		});
	});
});

// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { SwtError, type GameData, type SchedulerDefinition, type ToolOutcome } from "@swarmtales/contracts";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineDirector, directorContext } from "../src/director/define.ts";
import { defineGame } from "../src/game/define-game.ts";
import { DIRECTOR_TAKE } from "../src/game/directors.ts";
import { resolveGame } from "../src/game/resolve.ts";
import type { ResolveInput } from "../src/game/types.ts";
import { defineHead } from "../src/mechanic/define-head.ts";
import { defineMechanic } from "../src/mechanic/define-mechanic.ts";
import { reply } from "../src/mechanic/definers.ts";

const text = (description: string) => Type.String({ description });
const warden = defineDirector(
	{
		id: "warden",
		summary: "Comments on a proposal.",
		options: Type.Object({ tone: Type.String({ default: "dry", description: "The tone" }) }, { description: "The options" }),
		on: [{ event: "votes.proposed", where: (payload) => payload !== null }],
		output: Type.Object({ line: text("The line") }, { description: "The answer" }),
		limits: { maxCalls: 3 },
	},
	{
		system: (ctx) => `You are ${ctx.name}, ${ctx.options.tone}.`,
		input: (ctx) => `tick ${String(ctx.tick)}: ${ctx.firings.map((firing) => firing.event).join()}`,
		act: async (answer, ctx) => {
			await ctx.call("post", { message: answer.line });
		},
		fallback: (ctx) => (ctx.firings.length === 0 ? undefined : { line: "..." }),
	},
);
const silent = defineDirector({ id: "silent", summary: "Says nothing.", on: [{ event: "votes.closed" }], output: Type.Null({ description: "Nothing" }) }, { system: () => "s", input: () => "i", act: () => Promise.resolve() });

const votes = defineMechanic(
	defineHead({ id: "votes", package: "@test/votes", summary: "Votes.", events: { proposed: Type.Object({}, { description: "A proposal" }) }, tools: { post: { description: "Posts a line.", params: Type.Object({ message: text("The line") }, { description: "The line" }), for: ["resident", "host"] } } }),
	{ tools: { post: { run: () => reply("ok") } } },
);
const TurnsOptions = Type.Object({ kinds: Type.Array(text("A kind"), { default: ["resident"], description: "Kinds" }), afterBlocks: Type.Optional(Type.Array(text("A kind"), { description: "Kinds" })) }, { description: "Turns" });
const turns: SchedulerDefinition = { id: "@test/turns", revision: 1, determinism: "seeded", options: TurnsOptions, events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) };
const input = (game: ResolveInput["game"], more: Partial<ResolveInput> = {}): ResolveInput => ({ game, schedulers: { turns }, prompts: { render: (_owner, id) => id }, ...more });
const scheduler = { id: "turns", options: { afterBlocks: ["director"] } };
const data = (changes: Partial<GameData> = {}): GameData => ({ schema: 1, id: "demo", residents: 2, mechanics: [{ use: "votes" }], scheduler, end: { ticks: 5 }, ...changes });
const installed = { votes };
const failure = (run: () => unknown): readonly string[] => {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error.issues.map((issue) => `${issue.code} ${issue.where?.path ?? "-"}`);
		throw error;
	}
	return ["no error"];
};

describe("defineDirector", () => {
	it("gives back the head, parses options with defaults, and runs the body", async () => {
		expect([warden.id, warden.summary, warden.limits, warden.on.map((trigger) => ("event" in trigger ? [trigger.event, trigger.where?.(null)] : [])), silent.limits]).toEqual(["warden", "Comments on a proposal.", { maxCalls: 3 }, [["votes.proposed", false]], {}]);
		expect([warden.parseOptions(undefined), warden.parseOptions({ tone: "warm" }), silent.parseOptions({})]).toEqual([{ tone: "dry" }, { tone: "warm" }, {}]);
		expect(failure(() => warden.parseOptions({ tone: 3, ton: "x" }))).toEqual(["SWT-G020 options.ton", "SWT-G020 options.tone"]);
		expect(failure(() => warden.parseOptions([]))).toEqual(["SWT-G020 options"]);
		const firings = [{ n: 1, tick: 2, event: "votes.proposed", payload: {} }];
		const ctx = { name: "host", options: { tone: "dry" }, tick: 2, firings, facts: {} };
		expect([warden.system(ctx), warden.input(ctx), warden.fallback(ctx), warden.fallback({ ...ctx, firings: [] }), silent.fallback(ctx)]).toEqual(["You are host, dry.", "tick 2: votes.proposed", { line: "..." }, undefined, undefined]);
		const calls: unknown[] = [];
		const call = (tool: string, params: unknown): Promise<ToolOutcome> => Promise.resolve({ ok: false, code: "TOOL_NOT_GRANTED", message: String(calls.push([tool, params])) });
		await warden.act({ line: "Order." }, { ...ctx, call });
		expect(calls).toEqual([["post", { message: "Order." }]]);
	});
});

describe("resolveGame with Directors", () => {
	it("holds each Director with its definition, options, limits, actor and grant, by definition or by id", () => {
		const game = defineGame({ id: "demo", residents: 2, mechanics: [votes()], directors: [{ use: warden, as: "host", limits: { maxCostUsd: 1 } }, { use: "warden", options: { tone: "warm" } }], scheduler, end: { ticks: 5 } });
		const resolved = resolveGame(input(game));
		expect(resolved.directors).toEqual([
			{ name: "host", actor: "director:host", definition: warden, options: { tone: "dry" }, limits: { maxCostUsd: 1 }, model: undefined },
			{ name: "warden", actor: "director:warden", definition: warden, options: { tone: "warm" }, limits: { maxCalls: 3 }, model: undefined },
		]);
		expect(resolved.definition.actors.slice(2)).toEqual([{ id: "director:host", kind: "director", grant: "host", shared: {} }, { id: "director:warden", kind: "director", grant: "warden", shared: {} }]);
		expect(resolved.definition.grants).toEqual({ resident: ["@test/votes/votes/post"], host: [DIRECTOR_TAKE, "@test/votes/votes/post"], warden: [DIRECTOR_TAKE] });
		expect(resolved.data.directors).toEqual([{ use: "warden", as: "host", limits: { maxCostUsd: 1 }, options: { tone: "dry" } }, { use: "warden", options: { tone: "warm" } }]);
		const byId = resolveGame(input(data({ directors: [{ use: "warden", as: "host", limits: { maxCostUsd: 1 } }, { use: "warden", options: { tone: "warm" } }] }), { installed, directors: { warden } }));
		expect([byId.definition.game.hash, byId.directors]).toEqual([resolved.definition.game.hash, resolved.directors]);
	});

	it("resolves a game without Directors to what it was: no Director, no `take`, the same hash", () => {
		const [plain, empty] = [resolveGame(input(data(), { installed })), resolveGame(input(data({ directors: [] }), { installed, directors: { warden } }))];
		expect([plain.directors, empty.directors, "directors" in plain.data]).toEqual([[], [], false]);
		expect(plain.definition.grants).toEqual({ resident: ["@test/votes/votes/post"], host: ["@test/votes/votes/post"] });
		expect([empty.definition.game, empty.definition.actors, empty.definition.grants, empty.definition.plugins.map((plugin) => plugin.id)]).toEqual([plain.definition.game, plain.definition.actors, plain.definition.grants, ["votes", "roster"]]);
		expect(resolveGame(input(data({ directors: [{ use: "warden" }] }), { installed, directors: { warden } })).definition.game.hash).not.toBe(plain.definition.game.hash);
	});

	it("reports a trigger without an event as SWT-D001, a taken name or an unknown `use` as SWT-D002, a scheduler without the kind as SWT-D003", () => {
		const fails = (changes: Partial<GameData>): readonly string[] => failure(() => resolveGame(input(data(changes), { installed, directors: { warden, silent } })));
		expect(fails({ directors: [{ use: "warden" }, { use: "silent" }] })).toEqual(["SWT-D001 directors[1]"]);
		expect(fails({ directors: [{ use: "warden" }, { use: "wardn" }, { use: "warden" }, { use: "warden", as: "human" }] })).toEqual(["SWT-D002 directors[1].use", "SWT-D002 directors[2]", "SWT-D002 directors[3]"]);
		expect(fails({ directors: [{ use: "warden" }], scheduler: { id: "turns" } })).toEqual(["SWT-D003 scheduler.options"]);
		expect(fails({ directors: [{ use: "warden" }], scheduler: { id: "turns", options: { kinds: ["resident", "director"] } } })).toEqual(["no error"]);
		expect(fails({ directors: [{ use: "warden", options: { tone: 1 } }] })).toEqual(["SWT-G020 directors[0].options.tone"]);
		expect(fails({ directors: [{ use: "warden" }], scheduler: { id: "none" } })).toEqual(["SWT-G020 scheduler.id"]);
	});

	it("keeps the head's triggers and facts, and makes a context with the listed facts only (M5-06)", () => {
		const looker = defineDirector({ id: "looker", summary: "Looks.", on: [{ every: 2 }, { event: "tool_called", tool: "post" }, { event: "votes.proposed" }, { every: 3 }], facts: ["votes.count"], output: Type.Null({ description: "Nothing" }) }, { system: () => "s", input: () => "i", act: () => Promise.resolve() });
		expect([looker.on.length, looker.facts, silent.facts]).toEqual([4, ["votes.count"], []]);
		const director = { name: "eye", actor: "director:eye" as const, definition: looker, options: {}, limits: {}, model: undefined };
		const read: string[] = [];
		const ctx = directorContext(director, { tick: 4, firings: [] }, (key) => (read.push(key), 9));
		expect([ctx, read, directorContext(director, { tick: 1, firings: [], question: { dm: 2 } })]).toEqual([{ name: "eye", options: {}, tick: 4, firings: [], facts: { "votes.count": 9 } }, ["votes.count"], { name: "eye", options: {}, tick: 1, firings: [], question: { dm: 2 }, facts: {} }]);
	});
});

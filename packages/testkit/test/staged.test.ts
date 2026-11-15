// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Staged calls in the sdk and the testkit (12-m5-spec.md, 4.2; issue M5-03): `ctx.stage` by the declared name, the
 * typed `then` job (`onStaged`), the head's `stages` with the load check of the grant `script`, and replay and resume
 * of a run whose mechanic stages calls.
 */
import { SwtError, type Envelope, type GameData } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGame, defineHead, defineMechanic, defineTool, onStaged, reply, resolveGame } from "@swarmtales/sdk";
import { turns } from "@swarmtales/engine";
import { Type, type Static } from "typebox";
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, scriptedDriver } from "../src/drivers.ts";
import { play, testKernel } from "../src/play.ts";
import { replay } from "../src/replay.ts";
import { checkReplay, checkResumeEveryBoundary, type StandingDrivers } from "../src/standing.ts";

const None = Type.Object({}, { additionalProperties: false, description: "No arguments" });
const Beat = defineTool("beat", None);
const State = Type.Object({ beats: Type.Integer({ description: "The beats so far" }) }, { description: "The state of the drummer" });
const Ran = Type.Object({ ok: Type.Boolean({ description: "Whether the beat ran" }), text: Type.String({ description: "Its reply or refusal code" }) }, { additionalProperties: false, description: "A staged beat was answered" });

const head = defineHead({
	id: "drummer",
	package: "@test/drummer",
	summary: "Stages a beat at every tick start and after every knock.",
	options: Type.Object({ wrongData: Type.Boolean({ default: false, description: "Schedules the `then` job with data that is no outcome" }) }, { description: "The options of the drummer" }),
	state: State,
	start: (): Static<typeof State> => ({ beats: 0 }),
	events: { ran: Ran },
	tools: {
		beat: { description: "Beats once.", params: Beat.parameters, for: ["script"] },
		knock: { description: "Knocks; a beat follows.", params: None, for: ["resident"] },
	},
	stages: ["beat"],
});

const drummer = defineMechanic(head, {
	tools: {
		beat: {
			run(_params, ctx) {
				ctx.state.beats += 1;
				return reply(`beat ${String(ctx.state.beats)} by ${ctx.actor}`);
			},
		},
		knock: {
			sample: () => ({}),
			run(_params, ctx) {
				ctx.stage(Beat, {}, { then: "ran" });
				return reply("knocked");
			},
		},
	},
	hooks: {
		runStarted: (ctx) => {
			if (ctx.options.wrongData) ctx.schedule.at(1, "ran", { beats: 1 });
		},
		tickStarted: (ctx) => {
			ctx.stage("beat", {}, { then: "ran" });
		},
	},
	jobs: { ran: onStaged((ctx, outcome) => { ctx.emit("ran", outcome.ok ? { ok: true, text: outcome.reply } : { ok: false, text: outcome.code }); }) },
});

/** A tool with its own review, which the actor `script` cannot wait for. */
const judge = defineMechanic(defineHead({ id: "judge", package: "@test/judge", summary: "Has a reviewed tool.", tools: { rule: { description: "Rules.", params: None, for: ["script"] } } }), {
	tools: { rule: { review: { answerer: "judge", ask: () => undefined }, run: () => reply("ruled") } },
});

const game = defineGame({ id: "drums", residents: 2, seed: 5, mechanics: [drummer()], end: { ticks: 4 } });
const knocking: StandingDrivers = () => ({ resident: scriptedDriver((activation) => (activation.tick % 2 === 0 ? [{ tool: "knock", params: {} }] : [])) });
const kinds = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.actor === "script" || event.type === "ran").map((event) => `${event.actor} ${event.type}`);
const resolveOf = (data: GameData): unknown => {
	try {
		return resolveGame({ game: data, installed: { drummer, judge }, schedulers: { turns }, prompts: createPromptLookup() });
	} catch (error) {
		return error instanceof SwtError ? error.issues.map((issue) => `${issue.code} ${issue.where?.path ?? ""}`) : error;
	}
};

describe("ctx.stage and the typed then", () => {
	it("makes the staged call as the actor `script` under the shown name and hands the outcome to the `then` job", async () => {
		const renamed = defineGame({ id: "drums", residents: 2, seed: 5, mechanics: [{ ...drummer(), as: { beat: "drum" } }], end: { ticks: 1 } });
		const { events } = await play(renamed, { drivers: knocking });
		const called = events.filter((event) => event.type === "tool_called" && event.actor === "script");
		// One beat at tick start, one after the knock of each resident.
		expect(called.map((event) => event.payload)).toEqual([1, 2, 3].map(() => ({ as: "drum", params: {} })));
		expect(events.filter((event) => event.type === "ran").map((event) => event.payload)).toEqual([1, 2, 3].map((beat) => ({ ok: true, text: `beat ${String(beat)} by script` })));
	});

	it("ends the run with SWT-R003 when the `then` job gets data that is no outcome", async () => {
		const { kernel } = testKernel(defineGame({ id: "drums", residents: 1, mechanics: [drummer({ wrongData: true })], end: { ticks: 3 } }));
		const error: unknown = await kernel.run({ resident: idleDriver }).then(() => undefined, (thrown: unknown) => thrown);
		expect(error instanceof SwtError ? error.issues[0]?.code : error).toBe("SWT-R003");
		expect(kernel.log.all().at(-1)?.payload).toEqual({ reason: "error", detail: 'SWT-R003: drummer: a `then` job of "drummer" got {"beats":1}, which is no outcome of a staged call' });
	});
});

describe("the grant of `script`", () => {
	const data: GameData = { schema: 1, id: "drums", residents: 2, mechanics: [{ use: "drummer" }], end: { ticks: 2 } };

	it("lists the actor `script` when its grant holds a tool, and refuses a game whose grant lacks a staged tool (SWT-G015)", () => {
		expect(resolveOf(data)).toMatchObject({ definition: { actors: [{ id: "resident:A01" }, { id: "resident:A02" }, { id: "script", kind: "script", grant: "script" }] } });
		expect(resolveOf({ ...data, grants: { script: [] } })).toEqual(["SWT-G015 mechanics[0]"]);
		expect(resolveOf({ ...data, grants: { script: { drop: ["beat"] } } })).toEqual(["SWT-G015 mechanics[0]"]);
	});

	it("refuses a game whose grant `script` holds a tool with a review (SWT-G015)", () => {
		const issues = resolveOf({ ...data, mechanics: [{ use: "drummer" }, { use: "judge" }] });
		expect(issues).toContain("SWT-G015 mechanics[1]");
		expect(resolveOf({ ...data, mechanics: [{ use: "drummer" }, { use: "judge" }], grants: { script: { drop: ["rule"] } } })).toEqual(["SWT-D004 mechanics[1]"]);
	});

	it("counts the calls of `script` against `maxCallsPerTick` like every actor of the definition (erratum J13)", async () => {
		const { events } = await play({ ...data, limits: { maxCallsPerTick: 1 } }, { installed: { drummer }, drivers: { resident: scriptedDriver(() => [{ tool: "knock", params: {} }]) } });
		expect(events.filter((event) => event.type === "tool_refused" && event.actor === "script").map((event) => event.payload)).toContainEqual(expect.objectContaining({ stage: "limit", code: "STEP_LIMIT" }));
	});
});

describe("replay and resume of staged calls", () => {
	it("replays a run with staged calls equal: a call of `script` is staged again, not made again", async () => {
		const { events } = await play(game, { drivers: knocking });
		expect(kinds(events).slice(0, 6)).toEqual(["script tool_called", "script tool_result", "script ran", "script tool_called", "script tool_result", "script ran"]);
		const again = await replay({ game, log: events });
		expect(again.firstDifference).toBeUndefined();
		expect(again.equal).toBe(true);
		expect(await checkReplay(game, knocking)).toEqual([]);
		expect(await checkReplay(game, (kernel) => ({ resident: fakeDriver(kernel, 5) }), { seed: 5 })).toEqual([]);
	});

	it("resumes from every boundary to the log of the straight run", async () => {
		expect(await checkResumeEveryBoundary(game, knocking)).toEqual([]);
		expect(await checkResumeEveryBoundary(game, (kernel) => ({ resident: fakeDriver(kernel, 5) }), { seed: 5 })).toEqual([]);
	});
});

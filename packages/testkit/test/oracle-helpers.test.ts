// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The helpers of a game's oracle and metrics tests (decision A44): `playOracle` gives the run that `runOracle`
 * compares, `withEndsTurn` writes back the flag no file of `oracles/` holds, and `metricsOf` reads a mechanic's
 * metrics as the lab's facts do. The oracle is the folded log of a reference run of the fixture game.
 */
import { defineGame, defineHead, defineMechanic, defineMetric, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { guessNumber } from "../src/fixtures/guess-number.ts";
import { metricsOf } from "../src/metrics.ts";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf, withEndsTurn } from "../src/oracle/read.ts";
import { playOracle, runOracle } from "../src/oracle/run.ts";
import { timelineOf } from "../src/oracle/timeline.ts";
import { play } from "../src/play.ts";

// One resident guesses 1, then 2, then 3, one guess a tick, as in `oracle-cut.test.ts`.
const game = defineGame({ id: "guess", residents: 1, seed: 7, mechanics: [guessNumber({ max: 3 })], end: { ticks: 5 } });
const full = timelineOf((await play(game, { seed: 7, script: { A01: [1, 2, 3].map((value) => ["guess", { value }] as const) } })).events);

const fileOf = (timeline: readonly OracleEntry[], truncated?: Oracle["truncated"]): Oracle => ({
	format: "swarmtales.oracle",
	version: 1,
	game: "guess",
	variant: "guess",
	seed: 7,
	runtimeRevision: 3,
	source: { kind: "scripted", from: "packages/testkit/test/oracle-helpers.test.ts" },
	setup: { story: "guess", seed: 7, minutes: 5, residents: ["A01"], mechanics: [{ id: "guess-number", options: { max: 3 } }], residentTools: ["guess"], locked: [], turns: { passes: 1, blockSize: 1, activation: "always", order: "seeded" } },
	...(truncated === undefined ? {} : { truncated }),
	counts: countsOf(timeline),
	timeline: [...timeline],
});

// A mechanic with one metric on its head: the counts made, absent without one; its tool `count` makes one.
const counts = { counted: Type.Object({ by: Type.String() }, { description: "A resident counted." }) };
const counterHead = defineHead({
	id: "counter",
	package: "@swarmtales/testkit",
	summary: "Residents count; the metric `counts` reads how often.",
	options: Type.Object({}, { description: "No options." }),
	events: counts,
	metrics: [defineMetric(counts, { id: "counts", title: "Counts", reads: ["counted"], compute: (made) => (made.length === 0 ? undefined : made.length) })],
	tools: { count: { description: "Count once.", params: Type.Object({}, { description: "No arguments." }), for: ["resident"] } },
});
const counter = defineMechanic(counterHead, {
	tools: {
		count: {
			run(_params, ctx) {
				ctx.emit("counted", { by: ctx.resident ?? "" });
				return reply("Counted.", { endsTurn: true });
			},
			sample: () => ({}),
		},
	},
});
const counting = defineGame({ id: "count", residents: 1, mechanics: [guessNumber({ max: 3 }), counter()], end: { ticks: 3 } });

describe("playOracle", () => {
	it("plays the run of the file: its new log folds into the file's timeline", async () => {
		const { events, end } = await playOracle(fileOf(full), game);
		expect(timelineOf(events)).toEqual(full);
		expect(end).toMatchObject({ reason: "limit" });
	});

	it("plays a cut file to the end of the tick of its cut, and refuses what `runOracle` refuses", async () => {
		const { end, events } = await playOracle(fileOf(full, { afterMinute: -1, reason: "no tick" }), game);
		expect(end).toBeUndefined();
		expect(timelineOf(events).filter((entry) => entry.k === "call")).toEqual([]);
		await expect(playOracle({ ...fileOf(full), timeline: [{ k: "resume", minute: 0 }, ...full] }, game)).rejects.toThrow(/SWT-T002/);
	});
});

describe("withEndsTurn", () => {
	// The file as `oracles/` holds them: no call carries the flag.
	const bare = full.map((entry): OracleEntry => {
		if (entry.k !== "call") return entry;
		const { endsTurn, ...call } = entry;
		expect(typeof endsTurn).not.toBe("string");
		return call;
	});

	it("writes the flag on the accepted calls that ended a turn, and the file matches again", async () => {
		expect(full.some((entry) => entry.k === "call" && entry.endsTurn === true)).toBe(true);
		// The test file states no end, so only the timeline is compared.
		const timeline = async (oracle: Oracle): Promise<readonly string[]> => (await runOracle(oracle, game)).filter((mismatch) => mismatch.at !== "end").map((mismatch) => `${String(mismatch.level)} ${mismatch.at}`);
		expect(await timeline(fileOf(bare))).toEqual(["2 call"]);
		expect(withEndsTurn(fileOf(bare), (call) => call.tool === "guess").timeline).toEqual(full);
		expect(await timeline(withEndsTurn(fileOf(bare), (call) => call.tool === "guess"))).toEqual([]);
	});

	it("leaves a refused call and a call the rule does not name as they were", () => {
		const refused = bare.map((entry) => (entry.k === "call" ? { ...entry, ok: false } : entry));
		expect(withEndsTurn(fileOf(refused), () => true).timeline).toEqual(refused);
		expect(withEndsTurn(fileOf(bare), () => false).timeline).toEqual(bare);
	});
});

describe("metricsOf", () => {
	it("reads each metric over the mechanic's own events, absent without them, and nothing for a mechanic the game lacks", async () => {
		// A01 counts twice; the guesses write `guessed` events of another mechanic, which the metric does not see.
		const { events } = await play(counting, { seed: 7, script: { A01: [["count", {}], ["guess", { value: 1 }], ["count", {}]] } });
		expect(events.filter((event) => event.type === "guessed").length).toBe(1);
		expect(metricsOf(counting, "counter", events)).toEqual({ counts: 2 });
		expect(metricsOf(counting, "guess-number", events)).toEqual({});
		const none = await play(counting, { seed: 7 });
		expect(metricsOf(counting, "counter", none.events)).toEqual({ counts: "absent" });
		expect(metricsOf(counting, "chess", events)).toEqual({});
	});
});

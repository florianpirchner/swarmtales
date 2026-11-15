// SPDX-License-Identifier: Apache-2.0
// Tests 5 and 7 of section 3.7 of the M4 specification: replay by the close line under sixty interleavings, and
// resume from every boundary by replay.
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { rngFor } from "@swarmtales/kernel";
import { defineGame } from "@swarmtales/sdk";
import { play, replay, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { parallel } from "../src/index.ts";
import { board } from "./board.ts";

const schedulers = { turns, parallel };
const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);
const ACTIVATIONS = ["toAct", "always", "onNews"] as const;
type Mode = (typeof ACTIVATIONS)[number];

const gameOf = (activation: Mode) =>
	defineGame({ id: "race", seed: 7, residents: 4, mechanics: [board({ who: ["A01", "A02", "A03", "A04"] })], scheduler: { id: "parallel", options: { activation, activations: 2 } }, end: { ticks: 4 } });

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

// A driver that waits a seeded random time before each of its zero to two posts and before it returns; under
// `onNews` it is pending after one activation in three.
const racer =
	(seed: number, activation: Mode): ActorDriver =>
	async (turn) => {
		const rng = rngFor(seed, turn.actor, turn.tick, JSON.stringify(turn.detail));
		const posts = rng.int(0, 2);
		for (let post = 0; post < posts; post++) {
			await sleep(rng.int(0, 3));
			await turn.call("post", {});
		}
		// The time after the last call: without the close line as an input, the replay would close at once.
		await sleep(rng.int(0, 3));
		return activation === "onNews" && rng.int(0, 2) === 0 ? { pending: true } : undefined;
	};

const field = (value: unknown, key: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined);
const reasons = (log: readonly Envelope[]): readonly unknown[] => log.filter((event) => event.type === "activation_opened").map((event) => field(field(event.payload, "detail"), "reason"));
const text = (log: readonly Envelope[]): string => JSON.stringify(log);

// A value as a snapshot file gives it back: written as JSON with the keys of every object sorted, and read again.
const stored = (value: unknown): unknown => {
	const sorted = (_key: string, inner: unknown): unknown => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => (left < right ? -1 : 1))) : inner);
	const parsed: unknown = JSON.parse(JSON.stringify(value, sorted));
	return parsed;
};

describe("parallel: replay by the close line", () => {
	for (const activation of ACTIVATIONS) {
		it(`replays twenty races under \`${activation}\` to themselves, and the races differ`, async () => {
			const game = gameOf(activation);
			const logs: string[] = [];
			const opened: unknown[] = [];
			for (const seed of SEEDS) {
				const { events } = await play(game, { schedulers, drivers: { resident: racer(seed, activation) } });
				expect(events.some((event) => event.type === "tool_result")).toBe(true);
				const again = await replay({ game, log: events, schedulers });
				expect([seed, again.issue]).toEqual([seed, undefined]);
				logs.push(text(events));
				opened.push(...reasons(events));
			}
			expect(new Set(logs).size).toBeGreaterThanOrEqual(2);
			if (activation === "onNews") expect(opened).toContain("answer");
		});
	}
});

describe("parallel: resume by replay", () => {
	it("resumes a kernel from the snapshot of every boundary, and the replay drivers of the rest write the rest of the log", async () => {
		const game = gameOf("onNews");
		const { kernel } = testKernel(game, { schedulers });
		const drivers = { resident: racer(3, "onNews") };
		const cuts: { readonly snapshot: unknown; readonly lines: number }[] = [];
		while (kernel.ended === undefined) {
			cuts.push({ snapshot: stored(kernel.snapshot()), lines: kernel.log.length });
			await kernel.run(drivers, { ticks: 1 });
		}
		const straight = kernel.log.all();
		expect(cuts).toHaveLength(4);
		expect(reasons(straight)).toContain("answer");
		for (const cut of cuts) {
			const resume = { snapshot: cut.snapshot, log: straight.slice(0, cut.lines).map((event) => stored(event)) };
			const again = await replay({ game, log: straight, schedulers, resume });
			expect([cut.lines, again.issue]).toEqual([cut.lines, undefined]);
		}
	});
});

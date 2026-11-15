// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Cut files in `runOracle` (specification of M2, section 7.2): a file with `truncated` is played for
 * `truncated.afterMinute + 1` ticks and compared up to its last entry, without the end. The oracle here is the
 * folded log of a reference run of the fixture game, cut by hand; the runner itself is tested against a hand-written
 * file in `oracle.test.ts`.
 */
import { defineGame } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import { guessNumber } from "../src/fixtures/guess-number.ts";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf } from "../src/oracle/read.ts";
import { runOracle } from "../src/oracle/run.ts";
import { timelineOf } from "../src/oracle/timeline.ts";
import { play } from "../src/play.ts";

// One resident guesses 1, then 2, then 3, one guess a tick; with the seed 7 the secret is not 1, so the run has at least two ticks.
const game = defineGame({ id: "guess", residents: 1, seed: 7, mechanics: [guessNumber({ max: 3 })], end: { ticks: 5 } });
const full = timelineOf((await play(game, { seed: 7, script: { A01: [1, 2, 3].map((value) => ["guess", { value }] as const) } })).events);
const minutes = full.flatMap((entry, index) => (entry.k === "minute" ? [index] : []));
const lastTick = minutes.length - 1;

const cutFile = (timeline: readonly OracleEntry[], afterMinute: number): Oracle => ({
	format: "swarmtales.oracle",
	version: 1,
	game: "guess",
	variant: "guess",
	seed: 7,
	runtimeRevision: 3,
	source: { kind: "scripted", from: "packages/testkit/test/oracle-cut.test.ts" },
	setup: { story: "guess", seed: 7, minutes: 5, residents: ["A01"], mechanics: [{ id: "guess-number", options: { max: 3 } }], residentTools: ["guess"], locked: [], turns: { passes: 1, blockSize: 1, activation: "always", order: "seeded" } },
	truncated: { afterMinute, reason: "a test" },
	counts: countsOf(timeline),
	timeline: [...timeline],
});
const found = async (oracle: Oracle): Promise<readonly string[]> => (await runOracle(oracle, game)).map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`);

describe("runOracle on a cut file", () => {
	it("plays a file that is cut inside a tick and ignores what the run writes after the file's last entry", async () => {
		expect(lastTick).toBeGreaterThanOrEqual(1);
		// Cut after tick 1 began, before its turn: the run goes on to the end of that tick and opens the turn.
		const cut = (minutes[1] ?? 0) + 1;
		expect(full[cut]?.k).toBe("turn");
		expect(await found(cutFile(full.slice(0, cut), 1))).toEqual([]);
	});

	it("does not compare the end: the run may end in the tick of the cut", async () => {
		// Everything but the last entry (the limit that ends the run); the run still reaches its end in that tick.
		expect(full.at(-1)).toMatchObject({ k: "event", type: "referee_intervened" });
		expect(await found(cutFile(full.slice(0, -1), lastTick))).toEqual([]);
	});

	it("still finds a fault before the cut", async () => {
		const faulty = full.slice(0, -1).map((entry) => (entry.k === "call" && entry.ok ? { ...entry, reply: "1 is right." } : entry));
		expect(await found(cutFile(faulty, lastTick))).toEqual([`2 call ${String((minutes[0] ?? 0) + 2)}`]);
	});

	it("reports a file that goes on after the tick it says it is cut after", async () => {
		// The run stops after tick 0, so the file's entries of tick 1 have no counterpart.
		const next = minutes[1] ?? 0;
		expect(await found(cutFile(full.slice(0, -1), 0))).toEqual([`1 call ${String(next + 2)}`, `2 inputs ${String(next + 1)}`, `3 turn ${String(next)}`]);
	});
});

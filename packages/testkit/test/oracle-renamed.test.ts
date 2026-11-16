// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The option `renamed` of `runOracle` (`13-m6-spec.md` 4.3, decision A122): a file recorded under a mechanic id that
 * this platform renamed matches again when the old id is mapped, and its texts are compared as they are.
 */
import { defineGame } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { guessNumber } from "../src/fixtures/guess-number.ts";
import { OracleSchema, type Oracle, type OracleEntry } from "../src/oracle/format.ts";
import { countsOf } from "../src/oracle/read.ts";
import { renamedOracle } from "../src/oracle/renamed.ts";
import { runOracle } from "../src/oracle/run.ts";
import { timelineOf } from "../src/oracle/timeline.ts";
import { play } from "../src/play.ts";

const game = defineGame({ id: "guess", residents: 1, seed: 7, mechanics: [guessNumber({ max: 3 })], end: { ticks: 5 } });
const full = timelineOf((await play(game, { seed: 7, script: { A01: [1, 2, 3].map((value) => ["guess", { value }] as const) } })).events);

const fileOf = (timeline: readonly OracleEntry[], mechanic: string, extra: Partial<Oracle> = {}): Oracle => ({
	format: "swarmtales.oracle",
	version: 1,
	game: "guess",
	variant: "guess",
	seed: 7,
	runtimeRevision: 3,
	source: { kind: "scripted", from: "packages/testkit/test/oracle-renamed.test.ts" },
	setup: { story: "guess", seed: 7, minutes: 5, residents: ["A01"], mechanics: [{ id: mechanic, options: { max: 3 } }], residentTools: ["guess"], locked: [], turns: { passes: 1, blockSize: 1, activation: "always", order: "seeded" } },
	counts: countsOf(timeline),
	timeline: [...timeline],
	...extra,
});

// The file as the old platform would have written it: the id `guess-number` was `old-guess` in every place that is an id.
const asOld = (oracle: Oracle): Oracle => Value.Parse(OracleSchema, JSON.parse(JSON.stringify(oracle).replaceAll('"guess-number"', '"old-guess"').replaceAll('"guess-number.', '"old-guess.')));
const notEnd = (mismatches: readonly { readonly at: string }[]): readonly string[] => mismatches.filter((mismatch) => mismatch.at !== "end").map((mismatch) => mismatch.at);

describe("runOracle with renamed ids", () => {
	it("matches a file under the old id only when the id is mapped", async () => {
		const old = asOld(fileOf(full, "guess-number"));
		expect(JSON.stringify(old)).not.toContain('"guess-number');
		expect(notEnd(await runOracle(fileOf(full, "guess-number"), game))).toEqual([]);
		expect(notEnd(await runOracle(old, game))).not.toEqual([]);
		expect(notEnd(await runOracle(old, game, 3, { renamed: { "old-guess": "guess-number" } }))).toEqual([]);
	});

	it("maps sources, ids, payload strings, the end's fact and the counts, and leaves texts and params", () => {
		const timeline: OracleEntry[] = [
			{ k: "turn", resident: "A01", pass: 1, block: 1, inputs: [{ source: "brain+old-guess", text: "old-guess is the game" }] },
			{ k: "call", actor: "resident:A01", tool: "guess", params: { note: "old-guess" }, ok: true, reply: "old-guess.solved" },
			{ k: "event", source: "old-guess", type: "guessed", actor: "resident:A01", payload: { by: "old-guess", limit: "old-guess.solved", list: ["old-guess", "old-guessing"], text: "old-guess wins" } },
		];
		const mapped = renamedOracle(fileOf(timeline, "old-guess", { end: { reason: "referee", minute: 3, limit: "old-guess.solved" }, counts: { entries: {}, events: { "old-guess.guessed": 1 } } }), { "old-guess": "new-guess" });
		expect(mapped.setup.mechanics.map((mechanic) => mechanic.id)).toEqual(["new-guess"]);
		expect(mapped.end).toEqual({ reason: "referee", minute: 3, limit: "new-guess.solved" });
		expect(mapped.counts.events).toEqual({ "new-guess.guessed": 1 });
		expect(mapped.timeline).toEqual([
			{ k: "turn", resident: "A01", pass: 1, block: 1, inputs: [{ source: "brain+new-guess", text: "old-guess is the game" }] },
			timeline[1],
			{ k: "event", source: "new-guess", type: "guessed", actor: "resident:A01", payload: { by: "new-guess", limit: "new-guess.solved", list: ["new-guess", "old-guessing"], text: "old-guess wins" } },
		]);
		expect(renamedOracle(mapped, undefined)).toBe(mapped);
	});
});

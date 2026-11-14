// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic alone against the oracle file in which no resident ever acts: the rolls, the timer's bids and calls,
 * the scores of every decision and the end of the match depend on the seed and the mechanic only, so the mechanic's
 * events must be the file's, payload for payload. The game's test plays all six files at level 3 with the brain.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { idleDriver, play, readOracle } from "@swarmtales/testkit";
import { diceGame } from "./support.ts";

const FILE = resolve(import.meta.dirname, "../../../oracles/liars-dice/liars-dice-g1-s13-silent.json");

describe("the silent oracle file", () => {
	it("has the mechanic's events of a run in which the timer plays for every seat", async () => {
		const oracle = readOracle(FILE);
		const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "liars-dice" ? [{ type: entry.type, payload: entry.payload }] : []));
		const run = await play({ ...diceGame({ games: 1 }), seed: oracle.seed }, { drivers: { resident: idleDriver } });
		const played = run.events.filter((event) => event.source.endsWith("/liars-dice")).map((event) => ({ type: event.type, payload: event.payload }));
		expect(recorded).toHaveLength(97);
		expect(played).toEqual(recorded);
	});
});

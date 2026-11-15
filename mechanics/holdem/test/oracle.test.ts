// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic alone against the oracle file in which no resident ever acts: the deals, the timer's checks and folds,
 * the scores of every decision and the end of the match depend on the seed and the mechanic only, so the mechanic's
 * events must be the file's, payload for payload (the brain of the file only moves the ticks a game starts at). The
 * game's test plays the files at level 3 with the brain.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { idleDriver, play, readOracle } from "@swarmtales/testkit";
import { holdemGame } from "./support.ts";

const FILE = resolve(import.meta.dirname, "../../../oracles/holdem/holdem-hu-s13-silent.json");

describe("the silent oracle file", () => {
	it("has the mechanic's events of a heads-up run in which the timer plays for every seat", async () => {
		const oracle = readOracle(FILE);
		const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "holdem" ? [{ type: entry.type, payload: entry.payload }] : []));
		const run = await play({ ...holdemGame({ games: 2, hands: 12, equitySamples: 400 }, 2), seed: oracle.seed }, { drivers: { resident: idleDriver } });
		const played = run.events.filter((event) => event.source.endsWith("/holdem")).map((event) => ({ type: event.type, payload: event.payload }));
		expect(recorded).toHaveLength(175);
		expect(played).toEqual(recorded);
	});
});

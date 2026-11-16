// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Addition 3 of issue 11, `cityofkeys-act1-classifier-s7.json` (the City with the Confessor), against the game at
 * level 3, as section 3.4 of the M5 specification holds it (finding 4 of `docs/M5-REVIEW.md`, issue M5-105). It is
 * played as `oracle.test.ts` plays the other Act I files, after the game's registered changes (`registered`) and the
 * Confessor's (`confessed`, `oracles/cityofkeys/README.md`, "The Confessor against the file"): the harness drives the
 * Confessor by the call of `interpret` its own `act` makes on the firings it took, with the old model's answer of
 * each round, and `interpretations` writes the events the file's classifier wrote.
 */
import { join } from "node:path";
import { playOracle, readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { confessed, confessorFirings } from "./confessed.ts";
import { gameOf, ORACLES, registered } from "./support.ts";

const FILE = "cityofkeys-act1-classifier-s7.json";
// The rounds whose look in the file holds the old classifier's call: after minutes 1, 2, 5, 6, 9 and 10.
const ASKED = [2, 3, 6, 7, 10, 11];

const file = (): Oracle => registered(readOracle(join(ORACLES, FILE)));

// The file with the labels of its first `interpretation` changed by hand.
function relabelled(oracle: Oracle): Oracle {
	const at = oracle.timeline.findIndex((entry) => entry.k === "event" && entry.type === "interpretation");
	const timeline = oracle.timeline.map((entry, index) => (index === at && entry.k === "event" ? { ...entry, payload: { ...(typeof entry.payload === "object" ? entry.payload : {}), labels: ["threat"] } } : entry));
	return { ...oracle, timeline };
}

describe("city against addition 3 of issue 11", () => {
	it(`${FILE}: runOracle finds no mismatch at level 3`, async () => {
		const { oracle } = await confessed(file());
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	}, 120_000);

	it("asks a question in the rounds the old classifier was called in, and writes the round of the old model's failure as an error", async () => {
		const { asked } = await confessed(file());
		expect(asked.map(({ tick }) => tick)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
		expect(asked.filter(({ question }) => question !== "").map(({ tick }) => tick)).toEqual(ASKED);
		expect(asked.filter(({ params }) => params !== undefined).map(({ tick }) => tick)).toEqual(ASKED);
		expect(asked.find(({ tick }) => tick === 7)?.params).toMatchObject({ round: 7, error: "the classifier gave no answer", items: [] });
	}, 120_000);

	it("takes the same firings when it is driven by its calls, so the references of the calls are the run's", async () => {
		const { oracle, firings } = await confessed(file());
		expect(confessorFirings((await playOracle(oracle, gameOf(oracle))).events)).toEqual(firings);
	}, 120_000);

	it("names the changed event in a copy of the file changed by hand", async () => {
		const { oracle } = await confessed(relabelled(file()));
		const mismatches = await runOracle(oracle, gameOf(oracle), 3);
		expect(mismatches).toMatchObject([{ level: 1, at: "event", expected: { source: "interpretations", type: "interpretation", payload: { labels: ["threat"] } } }]);
	}, 120_000);
});

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic against the five oracle files of nine men's morris, inside the test game of `support.ts`: each file is
 * played from its inputs under `turns` and compared at level 3 (rules, texts, scheduling). The files were recorded
 * with the morris-referee loaded, which is a port of its own: its entry of the setup and its `move_scored` events
 * (audience `human`, caused by a listener, read by nobody) are taken out of the expectation here, and by nothing
 * else. The whole files, with the referee and the briefing, belong to the game issue.
 */
import { join } from "node:path";
import { countsOf, readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame, type MorrisGameOptions } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "morris-teams");
const REFEREE = "morris-referee";
const FILES: readonly (readonly [string, MorrisGameOptions])[] = [
	["morris-teams-s13-silent.json", {}],
	["morris-teams-nobrain-solo-s13.json", { brain: false, teamSize: 1 }],
	["morris-teams-nobrain-solo-vs-engine3-s31.json", { brain: false, teamSize: 1, engineDepth: 3 }],
	["morris-teams-nobrain-solo-vs-engine3-s33.json", { brain: false, teamSize: 1, engineDepth: 3 }],
	["morris-teams-solo-vs-engine3-s33.json", { teamSize: 1, engineDepth: 3 }],
];

function withoutReferee(oracle: Oracle): Oracle {
	const timeline = oracle.timeline.filter((entry) => entry.k !== "event" || entry.source !== REFEREE);
	return { ...oracle, setup: { ...oracle.setup, mechanics: oracle.setup.mechanics.filter((mechanic) => mechanic.id !== REFEREE) }, counts: countsOf(timeline), timeline };
}

describe("morris against its oracle files, without the referee", () => {
	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file, options) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(withoutReferee(oracle), morrisGame({ ...options, seed: oracle.seed }), 3)).toEqual([]);
	});
});

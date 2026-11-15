// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic against the oracle files of the every variant, inside the test game of `support.ts`: each file is
 * played from its inputs under `turns` and compared at level 3 (rules, texts, scheduling). The silent file is the
 * proof of the forfeit clock on the activation hooks; the files of the lists, the threats, the coach and the teams
 * prove the second half of the port (the team file: `wakeTeam`, the `told` list, `NOT_CAPTAIN`). The game with its
 * briefing is the game issue's.
 */
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { chessGame, type ChessGameOptions } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "chess");
const FILES: readonly (readonly [string, ChessGameOptions])[] = [
	["chess-s13-silent.json", {}],
	["chess-s13.json", {}],
	["chess-nobrain-s13.json", { brain: false }],
	["chess-p12-s13.json", { maxPlies: 12 }],
	["chess-settle-p12-s13.json", { maxPlies: 12, settleCap: true }],
	["chess-g4-p80-s41.json", { games: 4, maxPlies: 80 }],
	["chess-compact-g4-p80-s41.json", { games: 4, maxPlies: 80, compact: true }],
	["chess-fresh-compact-g4-p80-s47.json", { games: 4, maxPlies: 80, compact: true, fresh: true }],
	["chess-moves-s13.json", { moves: true }],
	["chess-moves-coach-s13.json", { moves: true, coach: true }],
	["chess-threats-s13.json", { threats: true }],
	["chess-teams-s13.json", { teams: true }],
];

/**
 * The files hold no `endsTurn`: the recorder read the answers from the residents' own log lines, which do not carry
 * it. The old mechanic set it on every accepted `playMove` and `resign` (runtime revision 2), and so does the port;
 * the scheduling of level 3 shows its effect. The expectation is completed here, and only by that field.
 */
function withEndsTurn(oracle: Oracle): Oracle {
	const ends = (tool: string): boolean => tool === "playMove" || tool === "resign";
	return { ...oracle, timeline: oracle.timeline.map((entry) => (entry.k === "call" && entry.ok && ends(entry.tool) ? { ...entry, endsTurn: true } : entry)) };
}

describe("chess against its oracle files, every variant", () => {
	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file, options) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(oracle.timeline.some((entry) => entry.k === "call" && entry.endsTurn === true)).toBe(false);
		expect(await runOracle(withEndsTurn(oracle), chessGame({ ...options, order: "seeded" }), 3)).toEqual([]);
	});
});

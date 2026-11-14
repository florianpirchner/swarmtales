// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: every file of `oracles/tictactoe/` is played from its inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling). The old name grammar is not carried, so this table
 * holds the options behind each `variant` of a file (specification of M1, section 8.2), and nothing else does.
 *
 * Two gaps of the oracle runner are pinned here until it is corrected (reported as interface changes of M1-35); the
 * game itself reproduces every file entry for entry, which the second block proves without the runner's comparison.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import { play, readOracle, runOracle, timelineOf, type Oracle, type OracleMismatch } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "tictactoe");

const VARIANTS: Readonly<Record<string, TicTacToeOptions>> = {
	"tictactoe-teams": {},
	"tictactoe-teams-nobrain": { brain: false },
	"tictactoe-teams-solo": { teamSize: 1 },
	"tictactoe-teams-4x4": { size: 4, line: 4 },
	"tictactoe-teams-5x5-nobrain-solo": { size: 5, line: 4, brain: false, teamSize: 1 },
};

// The seven files of the specification's table, and the two files of the default variant with the seed 13 (probes, silent).
const FILES = [
	"tictactoe-teams-4x4-s7.json",
	"tictactoe-teams-5x5-nobrain-solo-s1.json",
	"tictactoe-teams-5x5-nobrain-solo-s3.json",
	"tictactoe-teams-nobrain-s7.json",
	"tictactoe-teams-s11.json",
	"tictactoe-teams-s13-probes.json",
	"tictactoe-teams-s13-silent.json",
	"tictactoe-teams-s7.json",
	"tictactoe-teams-solo-s7.json",
];

/**
 * Gap 1 of the runner. A file holds the options of a mechanic as the old game wrote them; the runner compares them
 * with the options after the defaults of the schema are filled. The game writes every option of `grid-game`,
 * `consensus` and `optimal-referee`, and leaves these four to their defaults, as the old game did.
 */
const UNWRITTEN: Readonly<Record<string, object>> = {
	"team-channel": { notify: true },
	"strategy-brain": { postTool: "postTeam", retroFocus: "", solo: false },
};

function optionGaps(oracle: Oracle): readonly OracleMismatch[] {
	return Object.entries(UNWRITTEN).map(([id, defaults]) => {
		const stated = oracle.setup.mechanics.find((mechanic) => mechanic.id === id)?.options;
		const written = typeof stated === "object" && !Array.isArray(stated) ? stated : {};
		return { level: 1, at: "setup", index: -1, expected: { [`options.${id}`]: written }, actual: { [`options.${id}`]: { ...written, ...defaults } } };
	});
}

/**
 * Gap 2 of the runner. Its driver is never pending. The model of a recorded run owed an answer after every turn in
 * which it called a tool (the old replay agent's `awaitsAnswer`), so `turns` woke it in the next pass without news;
 * the two replays have such turns with no input line. This driver plays a file as the runner does (at its n-th
 * activation a resident makes the calls that follow its n-th `turn` entry) and is pending as the old agent was.
 */
function replayDriver(oracle: Oracle): ActorDriver {
	const turns = new Map<string, { readonly tool: string; readonly params: unknown }[][]>();
	for (const entry of oracle.timeline) {
		if (entry.k === "turn") turns.set(entry.resident, [...(turns.get(entry.resident) ?? []), []]);
		if (entry.k === "call") turns.get(entry.actor.slice(entry.actor.indexOf(":") + 1))?.at(-1)?.push(entry);
	}
	return async (activation) => {
		const calls = turns.get(nameOf(activation.actor))?.shift() ?? [];
		for (const call of calls) await activation.call(call.tool, call.params);
		return { pending: oracle.source.kind === "live-replay" && calls.length > 0 };
	};
}

const gameOf = (oracle: Oracle) => tictactoeGame(VARIANTS[oracle.variant]);

describe("tictactoe-teams against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 reports nothing but the pinned gaps of the runner", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		const found = await runOracle(oracle, gameOf(oracle), 3);
		expect(found.filter((mismatch) => mismatch.at === "setup")).toEqual(optionGaps(oracle));
		// A scripted file has no other mismatch. A replay diverges at its first turn without news (gap 2), and from there in every kind.
		expect(found.filter((mismatch) => mismatch.at !== "setup").map((mismatch) => mismatch.at)).toEqual(oracle.source.kind === "scripted" ? [] : ["call", "inputs", "turn", "end"]);
	});

	it.each(FILES)("%s: the game writes the timeline and the end of the file, entry for entry", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		const played = await play(gameOf(oracle), { seed: oracle.seed, ticks: oracle.setup.minutes, drivers: { resident: replayDriver(oracle) } });
		expect(timelineOf(played.events)).toEqual(oracle.timeline);
		expect(played.end).toEqual({ reason: "limit", tick: oracle.end?.minute, limit: oracle.end?.limit });
	});
});

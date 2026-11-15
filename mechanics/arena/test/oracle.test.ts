// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The arena's lines against the oracle files of Whispers and the City: `run_start` byte for byte, the key order of
 * every standings row, the rounds of `round_end`, and the end by the limit `arena.stop`. The standings' values need
 * every mechanic of the game; the game issues (M5-38, M5-45) compare them at level 3.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { play, readOracle, type Oracle } from "@swarmtales/testkit";
import { runFrame, Standing } from "../src/index.ts";

const ORACLES = resolve(import.meta.dirname, "../../../oracles");
const FILES = ["whispers/whispers-s7", "whispers/whispers-s11", "whispers/whispers-rumours-s7", "whispers/whispers-holdout-s7", "cityofkeys/cityofkeys-act1-s7", "cityofkeys/cityofkeys-act1-s11", "cityofkeys/cityofkeys-burn-s7", "cityofkeys/cityofkeys-act2-s7"];

const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: no codes.", provides: [LevelPiecesService] }), {
	services: { "level-pieces": { deal: () => null, solutionOf: () => null, kindOf: () => "none", teamOf: ({ resident }) => ({ members: [resident], leader: resident }), taskValues: () => ({ length: "", overlap: "", fragment: "", digits: "", factors: "" }), holders: () => [] } },
});

const arenaEvents = (oracle: Oracle, type: string) => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "arena" && entry.type === type ? [entry.payload] : []));
const keysOf = (value: unknown): readonly string[] => (typeof value === "object" && value !== null ? Object.keys(value) : []);
const rowsOf = (payload: unknown): readonly unknown[] => {
	const rows: unknown = Reflect.get(Object(payload), "standings");
	return Array.isArray(rows) ? rows.map((row: unknown) => row) : [];
};

describe.each(FILES)("oracle %s", (file) => {
	const oracle = readOracle(resolve(ORACLES, `${file}.json`));

	it("writes the file's run_start, standings rows in the file's key order, and the file's rounds", async () => {
		const game = defineGame({
			id: "arena-oracle",
			seed: oracle.seed,
			residents: [...oracle.setup.residents],
			mechanics: [ledger(), channels(), pieces(), progression({ levels: [{ number: 1, title: "Door", reward: 5, tools: [], task: "" }] }), runFrame({ story: oracle.setup.story })],
			scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
			end: { ticks: oracle.setup.minutes },
		});
		const { events } = await play(game);
		const ours = events.filter((event) => event.source.endsWith("arena"));
		const start = arenaEvents(oracle, "run_start");
		// The Act II files resume from an old snapshot and hold no start.
		if (start.length > 0) expect(JSON.stringify(ours[0]?.payload)).toBe(JSON.stringify(start[0]));
		const keys = Object.keys(Standing.properties);
		const ourRow = rowsOf(ours.find((event) => event.type === "round_end")?.payload)[0];
		expect(keysOf(ourRow)).toEqual(keys);
		const rows = [...arenaEvents(oracle, "round_end"), ...arenaEvents(oracle, "run_end")].flatMap(rowsOf);
		expect(rows.length).toBeGreaterThan(5);
		for (const row of rows) expect(keysOf(row)).toEqual(keys);
		const rounds = arenaEvents(oracle, "round_end").map((payload) => Number(Reflect.get(Object(payload), "round")));
		const first = rounds[0] ?? 0;
		expect(rounds).toEqual(rounds.map((_round, index) => first + index));
		if (oracle.end?.reason === "referee") expect(oracle.end.limit).toBe("arena.stop");
		else expect(rounds.at(-1)).toBe(oracle.setup.minutes);
	});
});

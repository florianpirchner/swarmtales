// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8, 9 and 10): the sha256 of the briefings of
 * all four branches, generated on the old platform (`briefing(brain, teams)` of `stories/chess/story.ts` for every
 * resident of the branch, as the JSON of the record resident to text), the tool names and start locks of every
 * variant, the model block with its output cap, the run length, the old variant names against the options that give
 * them, and the coach without the brain as a refusal with a code. The prompt files are
 * the mechanic's and are pinned by `mechanics/chess/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { SwtError } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { chessGame, ticksFor, type ChessOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** `briefing(brain, teams)` of the old game, for A01 and A02 (solo) or A01 to A04 (teams). */
const OLD_BRIEFINGS: readonly (readonly [ChessOptions, string])[] = [
	[{}, "425ce76cb56d41ce52f31c14ccb8185796dd37ebbac7b18e00b2591cc4cb1066"],
	[{ brain: false }, "a36ed28a3469292079289a7cf170c47020a9a64f539391e6394410271c408970"],
	[{ teams: true }, "b3d0f3862d23ae15078350a2a2d365a164fbd65723b02294ffe3eeb7e118033f"],
	[{ brain: false, teams: true }, "d91663e1feaf33f5ad6ba1aa553e151ce923432f49e84380698670117a3f3737"],
];
const OLD_BRIEFING = OLD_BRIEFINGS[0]?.[1];

/** The old parser (`chessEntryByName` of `stories/chess/story.ts`), carried as the reference of the names. */
const NAME = /^chess(-nobrain)?(-moves)?(-threats)?(-coach)?(-teams)?(-fresh)?(-compact)?(-settle)?(?:-g(\d+))?(?:-p(\d+))?$/;
const numberOf = (part: string | undefined): number | undefined => (part === undefined ? undefined : Number(part));
const outOf = (value: number | undefined, least: number, most: number): boolean => value !== undefined && (value < least || value > most);
/** The flags of the name as options, by the group of the pattern. */
const FLAGS: readonly (readonly [number, ChessOptions])[] = [
	[1, { brain: false }],
	[2, { showLegalMoves: true }],
	[3, { showThreats: true }],
	[4, { coach: true }],
	[5, { teams: true }],
	[6, { fresh: true }],
	[7, { compact: true }],
	[8, { settleCap: true }],
];
/** The options the old parser gave a name; undefined for a name it refused. */
function oldOptions(id: string): ChessOptions | undefined {
	const match = NAME.exec(id);
	if (match === null || (match[1] !== undefined && match[4] !== undefined)) return undefined;
	const [games, maxPlies] = [numberOf(match[9]), numberOf(match[10])];
	if (outOf(games, 1, 20) || outOf(maxPlies, 2, 400)) return undefined;
	const flags = FLAGS.filter(([index]) => match[index] !== undefined).reduce<ChessOptions>((all, [, options]) => ({ ...all, ...options }), {});
	return { ...flags, ...(games === undefined ? {} : { games }), ...(maxPlies === undefined ? {} : { maxPlies }) };
}

describe("carried byte for byte", () => {
	it("has the briefings of the old platform, in all four branches", () => {
		const game = chessGame();
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(OLD_BRIEFING);
		for (const [options, hash] of OLD_BRIEFINGS) expect(sha256(JSON.stringify(chessGame(options).briefing)), JSON.stringify(options)).toBe(hash);
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).briefing).toEqual(chessGame({ brain: options.brain ?? true, teams: options.teams ?? false }).briefing);
	});

	it("shows a seat the tools of the old game, in its order, and locks the move tools and the brain", () => {
		expect(chessGame().grants?.resident).toEqual(["viewBoard", "playMove", "resign", "readBrain", "writeBrain"]);
		expect(chessGame().locked).toEqual(["playMove", "resign", "writeBrain"]);
		expect(chessGame({ brain: false })).toMatchObject({ grants: { resident: ["viewBoard", "playMove", "resign"] }, locked: ["playMove", "resign"] });
		expect(chessGame({ teams: true })).toMatchObject({ title: "Chess teams", residents: ["A01", "A02", "A03", "A04"], grants: { resident: ["viewBoard", "playMove", "resign", "postTeam", "readTeam", "readBrain", "writeBrain"] }, locked: ["playMove", "resign", "writeBrain"] });
		expect(chessGame({ teams: true, brain: false })).toMatchObject({ grants: { resident: ["viewBoard", "playMove", "resign", "postTeam", "readTeam"] }, locked: ["playMove", "resign"] });
	});

	it("refuses the coach without the brain with SWT-G041, as the old parser refused the name", () => {
		expect(() => chessGame({ coach: true, brain: false })).toThrow(SwtError);
		expect(() => chessGame({ coach: true, brain: false })).toThrow(/SWT-G041/);
		expect(oldOptions("chess-nobrain-coach")).toBeUndefined();
		expect(chessGame({ coach: true }).id).toBe("chess");
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94)", () => {
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect(chessGame().title).toBe("Chess");
	});

	it("gives every old variant name of an oracle file and of the old runs index by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(options, name).toEqual(oldOptions(name));
		expect(["chess-g0", "chess-p1", "chess-p401", "chess-teams-moves"].map(oldOptions)).toEqual([undefined, undefined, undefined, undefined]);
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).id).toBe("chess");
	});

	it("has the old registry default as its defaults, and the old minutes of the files as its run length", () => {
		expect(chessGame()).toMatchObject({ seed: 29, residents: ["A01", "A02"], end: { ticks: 250 }, limits: { maxCallsPerTick: 16 }, win: { fact: "chess.scores" } });
		// The `minutes` of the setups of `oracles/chess/`: 250 for two games of 160 plies, 254 for four of 80.
		expect([ticksFor(2, 160), ticksFor(4, 80), chessGame(VARIANTS["chess-fresh-compact-g4-p80"]).end]).toEqual([250, 254, { ticks: 254 }]);
		expect(chessGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
		// The team variant doubles it: 500, the minutes of `chess-teams-s13.json`; 28 for a cap of 12 plies.
		expect([chessGame(VARIANTS["chess-teams"]).end, chessGame(VARIANTS["chess-p12"]).end, chessGame({ teams: true, ticks: 9 }).end]).toEqual([{ ticks: 500 }, { ticks: 28 }, { ticks: 9 }]);
	});

	it("runs under the scheduler of the old game: four passes on news, the reset line first, a team's sources in the old hook order", () => {
		expect(chessGame().scheduler).toEqual({ id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }] } });
		expect(chessGame({ teams: true }).scheduler).toEqual({ id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "chess" }, { source: "team-channel" }] } });
	});
});

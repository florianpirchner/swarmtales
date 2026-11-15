// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of the
 * two solo seats with a brain, generated on the old platform (`briefing(true, false)` of `stories/chess/story.ts`
 * for A01 and A02, as the JSON of the record seat to text), the tool names a seat is shown, the model block with its
 * output cap, the run length, and the old variant names against the options that give them. The prompt files are
 * the mechanic's and are pinned by `mechanics/chess/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { chessGame, ticksFor, type ChessOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** `briefing(true, false)` of the old game, for A01 and A02. */
const OLD_BRIEFING = "425ce76cb56d41ce52f31c14ccb8185796dd37ebbac7b18e00b2591cc4cb1066";

/** The old parser (`chessEntryByName` of `stories/chess/story.ts`), carried as the reference of the names. */
const NAME = /^chess(-nobrain)?(-moves)?(-threats)?(-coach)?(-teams)?(-fresh)?(-compact)?(-settle)?(?:-g(\d+))?(?:-p(\d+))?$/;
const numberOf = (part: string | undefined): number | undefined => (part === undefined ? undefined : Number(part));
const outOf = (value: number | undefined, least: number, most: number): boolean => value !== undefined && (value < least || value > most);
/** The flags of the name as options. */
const flagsOf = (match: RegExpExecArray): ChessOptions => ({ ...(match[6] === undefined ? {} : { fresh: true }), ...(match[7] === undefined ? {} : { compact: true }) });
/** The options the old parser gave a name, for the names of this game only (no flag of the variants). */
function oldOptions(id: string): ChessOptions | undefined {
	const match = NAME.exec(id);
	if (match === null || [1, 2, 3, 4, 5, 8].some((index) => match[index] !== undefined)) return undefined;
	const [games, maxPlies] = [numberOf(match[9]), numberOf(match[10])];
	if (outOf(games, 1, 20) || outOf(maxPlies, 2, 400)) return undefined;
	return { ...flagsOf(match), ...(games === undefined ? {} : { games }), ...(maxPlies === undefined ? {} : { maxPlies }) };
}

describe("carried byte for byte", () => {
	it("has the briefings of the old platform", () => {
		const game = chessGame();
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(OLD_BRIEFING);
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).briefing).toEqual(game.briefing);
	});

	it("shows a seat the tools of the old game, in its order, and locks the move tools and the brain", () => {
		expect(chessGame().grants?.resident).toEqual(["viewBoard", "playMove", "resign", "readBrain", "writeBrain"]);
		expect(chessGame().locked).toEqual(["playMove", "resign", "writeBrain"]);
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94)", () => {
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect(chessGame().title).toBe("Chess");
	});

	it("gives every old variant name of an oracle file and of the old runs index by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(options, name).toEqual(oldOptions(name));
		expect(["chess-g0", "chess-p1", "chess-p401", "chess-moves-g4-p80"].map(oldOptions)).toEqual([undefined, undefined, undefined, undefined]);
		for (const options of Object.values(VARIANTS)) expect(chessGame(options).id).toBe("chess");
	});

	it("has the old registry default as its defaults, and the old minutes of the files as its run length", () => {
		expect(chessGame()).toMatchObject({ seed: 29, residents: ["A01", "A02"], end: { ticks: 250 }, limits: { maxCallsPerTick: 16 }, win: { fact: "chess.scores" } });
		// The `minutes` of the setups of `oracles/chess/`: 250 for two games of 160 plies, 254 for four of 80.
		expect([ticksFor(2, 160), ticksFor(4, 80), chessGame(VARIANTS["chess-fresh-compact-g4-p80"]).end]).toEqual([250, 254, { ticks: 254 }]);
		expect(chessGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});

	it("runs under the scheduler of the old game: four passes on news, the reset line first", () => {
		expect(chessGame().scheduler).toEqual({ id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }] } });
	});
});

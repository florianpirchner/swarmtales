// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of eight
 * tables, generated on the old platform (`briefing(brain, seats, brainSeats)` of `stories/holdem/story.ts` for every
 * seat, as the JSON of the record seat to text), the tool names a seat is shown, the model block with its output
 * cap, and the old variant names against the options that give them. The prompt files are the mechanic's and are
 * pinned by `mechanics/holdem/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { SwtError } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { briefings } from "../briefing.ts";
import { holdemGame, type HoldemOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [string, HoldemOptions, string])[] = [
	["default", {}, "d906b5ff6f6ae573c6baee82cf940a0b93929ca34c8c8c7eb792e24208878bf8"],
	["nobrain", { brain: false }, "7a544dc6a649bb788a28794faa4f8a99aba4ad6d1b3602a0cfc07a56beec7bec"],
	["hu", { seats: 2 }, "51eef23dba4e7315add278973a46490ee8d0a5c7dde55f2098d816b5a450dc1b"],
	["hu-nobrain", { seats: 2, brain: false }, "1833196cab69b3ab4e2daf71c20eda2da26a73f2c911bb2c1322555fb9149c7a"],
	["3max", { seats: 3 }, "8e4fc6fd21c201890b18ee66ed6211a5c1fd1823c76509220516e03bebafa85d"],
	["6max-nobrain", { seats: 6, brain: false }, "97a52bc2b0dbf3134812b483795fb9530191b1bbd08d00f3a2d43a6ac78edf1a"],
];

/** The briefings of the mixed tables of the old registry (the game's params for them follow with M4-40). */
const OLD_MIXED: readonly (readonly [number, readonly string[], string])[] = [
	[4, ["A01", "A03"], "6b74fd21cc09ad7559e1eaaf35530526a7f093fb01778412bed566310db8a4f3"],
	[2, ["A01"], "67f89788d61288de4cdd6be8b308e892a2896cac15eea679bda9b14765d79bce"],
];

/** The old naming (`storyName` of `stories/holdem/story.ts`), carried as the reference of the names. */
function storyName(seats: number, brain: boolean, mixed: boolean, aid: boolean): string {
	return `holdem${seats === 2 ? "-hu" : seats === 4 ? "" : `-${String(seats)}max`}${aid ? "-aid" : ""}${brain ? (mixed ? "-mixed" : "") : aid ? "-mixed" : "-nobrain"}`;
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = holdemGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("writes the briefings of the old mixed tables", () => {
		for (const [seats, brainSeats, hash] of OLD_MIXED) expect(sha256(JSON.stringify(briefings(true, seats, brainSeats)))).toBe(hash);
	});

	it("shows a seat the tools of the old game, in its order, and locks the decision tools", () => {
		expect(holdemGame().grants?.resident).toEqual(["viewTable", "act", "readBrain", "writeBrain"]);
		expect(holdemGame({ brain: false }).grants?.resident).toEqual(["viewTable", "act"]);
		expect([holdemGame().locked, holdemGame({ brain: false }).locked]).toEqual([["act", "writeBrain"], ["act"]]);
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94)", () => {
		for (const options of [{}, { seats: 2 }, { brain: false }]) expect(holdemGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect([holdemGame().title, holdemGame({ seats: 2 }).title]).toEqual(["Hold'em", "Hold'em heads-up"]);
	});

	it("gives every old variant name of an oracle file and of the old registry by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(storyName(options.seats ?? 4, options.brain ?? true, false, false), name).toBe(name);
		expect([storyName(3, true, false, false), storyName(6, false, false, false)]).toEqual(["holdem-3max", "holdem-6max-nobrain"]);
		for (const options of Object.values(VARIANTS)) expect(holdemGame(options).id).toBe("holdem");
	});

	it("has the old registry defaults: four games of eight hands at four seats, two of twelve heads-up, 206 and 154 ticks", () => {
		expect(holdemGame()).toMatchObject({ seed: 41, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 206 }, limits: { maxCallsPerTick: 14 }, win: { fact: "holdem.scores" } });
		expect(holdemGame({ seats: 2 })).toMatchObject({ residents: ["A01", "A02"], end: { ticks: 154 } });
		expect(holdemGame({ seats: 3, games: 1, hands: 2 }).end).toEqual({ ticks: 12 + 4 + 4 });
		expect(holdemGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});

	it("refuses a table the old game refused, with a code of the params", () => {
		for (const seats of [1, 7, 2.5]) expect(() => holdemGame({ seats })).toThrow(SwtError);
		expect(() => holdemGame({ seats: 7 })).toThrow(/SWT-G041/);
	});
});

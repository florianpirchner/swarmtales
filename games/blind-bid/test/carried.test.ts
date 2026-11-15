// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of both
 * arms, generated on the old platform (`briefing(brain)` of `stories/blind-bid/story.ts` for every seat, as the JSON
 * of the record seat to text), the tool names a seat is shown, the model block without an output cap, and the old
 * variant names against the options that give them. The prompt files are the mechanic's and are pinned by
 * `mechanics/sealed-auction/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { blindBidGame, DEFAULT_LOTS, type BlindBidOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [string, BlindBidOptions, string])[] = [
	["brain", {}, "1e6feb51c81409b10b197597db356c07bc04c7b58337e91e0126ceb9de1b1254"],
	["nobrain", { brain: false }, "d692a30b1ebf829482695ed3efe82ce20449d2a5ee90f6c61efbac3df9e94889"],
];

/** The old naming: the id of `blindBidStory` and the parser `blindBidEntryByName` of `stories/blind-bid/story.ts`, carried as the reference of the names. */
const storyId = (brain: boolean, games: number): string => `blind-bid${brain ? "" : "-nobrain"}${games === 3 ? "" : `-g${String(games)}`}`;
const NAME = /^blind-bid(-nobrain)?(?:-g(\d+))?$/;
function oldOptions(id: string): BlindBidOptions | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const games = match[2] === undefined ? undefined : Number(match[2]);
	if (games !== undefined && (games < 1 || games > 20)) return undefined;
	return { ...(match[1] === "-nobrain" ? { brain: false } : {}), ...(games === undefined ? {} : { games }) };
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = blindBidGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a seat the tools of the old game, in its order, and locks the bid", () => {
		expect(blindBidGame().grants?.resident).toEqual(["viewAuction", "bid", "readBrain", "writeBrain"]);
		expect(blindBidGame({ brain: false }).grants?.resident).toEqual(["viewAuction", "bid"]);
		expect([blindBidGame().locked, blindBidGame({ brain: false }).locked]).toEqual([["bid", "writeBrain"], ["bid"]]);
	});

	it("carries the model block of the old entry, which set no output cap: the default of 4000 stands", () => {
		for (const options of [{}, { brain: false }]) expect(blindBidGame(options).model).toBe("anthropic/claude-haiku-5-5");
		expect(blindBidGame().title).toBe("Blind Bid");
		// The old hook numbers of the turn lines: the brain before the auction, after the reset line.
		expect(blindBidGame().scheduler?.options).toMatchObject({ passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "sealed-auction" }] });
	});

	it("gives every old variant name by the options of its row, and the old default by the default options", () => {
		for (const [name, options] of Object.entries(VARIANTS)) {
			expect(oldOptions(name), name).toEqual(options);
			expect(storyId(options.brain ?? true, options.games ?? 3)).toBe(name);
			expect(blindBidGame(options).id).toBe("blind-bid");
		}
		// The old parser refused a match of no games or of more than twenty.
		expect([oldOptions("blind-bid-g0"), oldOptions("blind-bid-g21")]).toEqual([undefined, undefined]);
	});

	it("has the old registry defaults: three games of six mixed lots, a purse of 100, seed 31, 48 ticks", () => {
		expect(DEFAULT_LOTS).toEqual(["first-price", "second-price", "common", "first-price", "common", "second-price"]);
		expect(blindBidGame()).toMatchObject({ seed: 31, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 48 }, limits: { maxCallsPerTick: 6 }, win: { fact: "sealed-auction.scores" } });
		expect(blindBidGame({ games: 5 }).end).toEqual({ ticks: 60 + 12 + 4 });
		expect(blindBidGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});
});

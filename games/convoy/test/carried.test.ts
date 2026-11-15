// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings with and
 * without a brain, generated on the old platform (`briefing(brain)` of `stories/convoy/story.ts` for every seat, as
 * the JSON of the record seat to text), the tool names a seat is shown, the model block with its output cap, the run
 * length, and the old variant names against the options that give them. The prompt files are the mechanic's and are
 * pinned by `mechanics/convoy/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { convoyGame, type ConvoyOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** The old parser (`parseConvoy` of `stories/index.ts`), carried as the reference of the names; the options it gave. */
const CONVOY_NAME = /^convoy(-nobrain)?(?:-g(\d+))?(?:-d(\d+))?(?:-c(\d+))?$/;
const numberOf = (text: string | undefined): number | undefined => (text === undefined ? undefined : Number(text));
const outside = (value: number | undefined, most: number): boolean => value !== undefined && (value < 1 || value > most);
function parseConvoy(id: string): ConvoyOptions | undefined {
	const match = CONVOY_NAME.exec(id);
	if (match === null) return undefined;
	const [games, damage, cooldown] = [numberOf(match[2]), numberOf(match[3]), numberOf(match[4])];
	if (outside(games, 20) || outside(damage, 8) || outside(cooldown, 8)) return undefined;
	return { ...(match[1] === "-nobrain" ? { brain: false } : {}), ...(games === undefined ? {} : { games }), ...(damage === undefined ? {} : { damageToLose: damage }), ...(cooldown === undefined ? {} : { cooldown }) };
}

describe("carried byte for byte", () => {
	it.each([
		[true, "467b69add8efd71a1f983fde48af362bdff6752128f5b745a345c2129dbd98cf"],
		[false, "717bb3587773e520b6ae6a34702fcafd25f9b04ef0599a34380a5bdf9968fb81"],
	])("has the briefings of the old platform, brain %s", (brain, hash) => {
		const game = convoyGame({ brain });
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a seat the tools of the old game, in its order, and locks the decision tools", () => {
		const decisions = ["proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse"];
		expect(convoyGame().grants?.resident).toEqual(["viewConvoy", ...decisions, "readBrain", "writeBrain"]);
		expect(convoyGame({ brain: false }).grants?.resident).toEqual(["viewConvoy", ...decisions]);
		expect([convoyGame().locked, convoyGame({ brain: false }).locked]).toEqual([[...decisions, "writeBrain"], decisions]);
		expect(convoyGame().scheduler).toEqual({ id: "turns", options: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "convoy" }] } });
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94)", () => {
		for (const options of [{}, { brain: false }, { games: 1 }]) expect(convoyGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect(convoyGame().title).toBe("Convoy");
	});

	it("gives every old variant name of an oracle file and of the old runs index by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(convoyGame(parseConvoy(name)), name).toEqual(convoyGame(options));
		expect(convoyGame(parseConvoy("convoy-d4"))).not.toEqual(convoyGame());
		expect([parseConvoy("convoy-nobrain-g2-d3-c2"), parseConvoy("convoy-d9")]).toEqual([{ brain: false, games: 2, damageToLose: 3, cooldown: 2 }, undefined]);
		for (const options of Object.values(VARIANTS)) expect(convoyGame(options).id).toBe("convoy");
	});

	it("has the old registry defaults: six seats, three games, seed 53, 258 ticks (90 for one game)", () => {
		expect(convoyGame()).toMatchObject({ seed: 53, residents: ["A01", "A02", "A03", "A04", "A05", "A06"], end: { ticks: 258 }, limits: { maxCallsPerTick: 8 }, win: { fact: "convoy.scores" } });
		expect(convoyGame({ games: 1 }).end).toEqual({ ticks: 90 });
		expect(convoyGame({ games: 1, crews: [2, 2, 3] }).end).toEqual({ ticks: 32 + 4 + 4 });
		expect(convoyGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});
});

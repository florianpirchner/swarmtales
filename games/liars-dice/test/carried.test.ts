// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of nine
 * tables, generated on the old platform (`briefing(brain, seats, talk)` of `stories/liars-dice/story.ts` for every
 * seat, as the JSON of the record seat to text), the tool names a seat is shown, the model block with its output
 * cap, and the old variant names against the options that give them. The prompt files are the mechanic's and are
 * pinned by `mechanics/liars-dice/test/carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { SwtError } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { liarsDiceGame, type LiarsDiceOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [string, LiarsDiceOptions, string])[] = [
	["default", {}, "c9a8b01753bbe8e7079c7457825241250264e02c8e4f5d25956fc16350997646"],
	["nobrain", { brain: false }, "ab8e5cfe076bd68c3af0f845697a2934b2e95cf567a233388d255deb1f793a8b"],
	["quiet", { talk: false }, "e94db568404ba6d907768427d91e681462830da54c69296c0f97990b0987a170"],
	["hu", { seats: 2 }, "eb13b91fa35d5798d82d21d99cebb97349ccc4c5d0ac30ceec8e78e74a4690b2"],
	["hu-quiet", { seats: 2, talk: false }, "44e52e3dee82462e4eed8710fd4692ff8a83c7c645309e20845980ba6b21e367"],
	["hu-nobrain-quiet", { seats: 2, brain: false, talk: false }, "b58875fc3a6d58d10d05a06e1d7dac783ea90fbb7d52130b8288bd3109823ffc"],
	["3p", { seats: 3 }, "e9f36958da6d58a7a9a936d5f580d398d6ec63adcf6a157b2ad512704651c5d2"],
	["5p-nobrain", { seats: 5, brain: false }, "a7cf3eb599d900da2dfbe73263f4dcd4b03c2b41f540cd4215ed2f5f06ced8f6"],
	["6p-quiet", { seats: 6, talk: false }, "8d02ec733e49e3d7c500007d83359e782971f0ec6d874d8124ec28c95c5a52bf"],
];

/** The old parser (`liarsDiceEntryByName` of `stories/liars-dice/story.ts`), carried as the reference of the names. */
const NAME = /^liars-dice(?:-(hu)|-([356])p)?(-nobrain)?(-quiet)?(?:-g(\d+))?(?:-d(\d+))?$/;
const numberOf = (part: string | undefined): number | undefined => (part === undefined ? undefined : Number(part));
const outOf = (value: number | undefined, most: number): boolean => value !== undefined && (value < 1 || value > most);
function oldOptions(id: string): LiarsDiceOptions | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const seats = match[1] === "hu" ? 2 : (numberOf(match[2]) ?? 4);
	const [games, dice] = [numberOf(match[5]), numberOf(match[6])];
	if (outOf(games, 20) || outOf(dice, 10)) return undefined;
	return { seats, ...(match[3] === "-nobrain" ? { brain: false } : {}), ...(match[4] === "-quiet" ? { talk: false } : {}), ...(games === undefined ? {} : { games }), ...(dice === undefined ? {} : { dice }) };
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = liarsDiceGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a seat the tools of the old game, in its order, and locks the decision tools", () => {
		expect(liarsDiceGame().grants?.resident).toEqual(["viewTable", "bid", "liar", "readBrain", "writeBrain"]);
		expect(liarsDiceGame({ brain: false }).grants?.resident).toEqual(["viewTable", "bid", "liar"]);
		expect([liarsDiceGame().locked, liarsDiceGame({ brain: false }).locked]).toEqual([["bid", "liar", "writeBrain"], ["bid", "liar"]]);
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94)", () => {
		for (const options of [{}, { seats: 2 }, { brain: false }]) expect(liarsDiceGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect([liarsDiceGame().title, liarsDiceGame({ seats: 2 }).title]).toEqual(["Liar's dice", "Liar's dice heads-up"]);
	});

	it("gives every old variant name of an oracle file and of the old registry by the options of its row", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect({ seats: 4, ...options }, name).toEqual(oldOptions(name));
		// The names of the old test of the registry, and one the old parser refused.
		expect(["liars-dice-hu", "liars-dice-hu-nobrain-quiet-g2-d5", "liars-dice-6p-g1"].map(oldOptions)).toEqual([{ seats: 2 }, { seats: 2, brain: false, talk: false, games: 2, dice: 5 }, { seats: 6, games: 1 }]);
		expect(oldOptions("liars-dice-d11")).toBeUndefined();
		for (const options of Object.values(VARIANTS)) expect(liarsDiceGame(options).id).toBe("liars-dice");
	});

	it("has the old registry default as its defaults: four seats, three games of four dice, 192 ticks", () => {
		expect(liarsDiceGame()).toMatchObject({ seed: 53, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 192 }, limits: { maxCallsPerTick: 14 }, win: { fact: "liars-dice.scores" } });
		expect(liarsDiceGame(VARIANTS["liars-dice-hu-quiet-g2-d5"]).end).toEqual({ ticks: 2 * 9 * 4 + 3 * 2 + 4 });
		expect(liarsDiceGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});

	it("refuses a table the old game refused, with a code of the params", () => {
		for (const seats of [1, 7, 2.5]) expect(() => liarsDiceGame({ seats })).toThrow(SwtError);
		expect(() => liarsDiceGame({ seats: 7 })).toThrow(/SWT-G041/);
	});
});

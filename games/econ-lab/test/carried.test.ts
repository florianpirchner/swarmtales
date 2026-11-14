// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (specification of M2, section 7): the sha256 of the eight briefings (four seats,
 * with and without the brain), generated on the old platform (`econLabEntry({ brain }).briefing(seat)` at `v0-final`),
 * the tool names a resident is shown, in their order, and what replaces the old variant names.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_BLOCKS, econLabGame } from "../game.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [boolean, Readonly<Record<string, string>>])[] = [
	[true, { A01: "a2edd60eeb1414f861ca573b0fc70c2ef3a9f2bfd1cc9fe4beeb45d8f18de998", A02: "2ceee79691a96d378a75b5c8d0b932d5d63dc9d62d6e40419da2baf9acfa4785", A03: "a3eaaafd603cb2e8b988d5dca279feeedbde5f8d27a3a10369b7b514dd260865", A04: "a73927826ae76989869ea0f09a55e99acae327c64c3610fe2f6129f08e6c6e23" }],
	[false, { A01: "347777ad586cef274f1e5d10f7e48d8a81b4dd1f33c06812e54cf5f7c42d9be7", A02: "79a50a36aad0ec0e6f34364597e260cc1869c742a9bad881ad3e0e91c335ecc5", A03: "6f3740524c409c969c9210105c0ed0a78307b03dfe4ef8842487911c23f4918e", A04: "2b30a4a0f02ed3b331e809761eb17bc4388178742d5ae8058f307a771b97c6ef" }],
];

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: brain %s", (brain, hashes) => {
		const briefing = econLabGame({ brain }).briefing;
		const texts = typeof briefing === "object" ? briefing : {};
		expect(Object.entries(texts).map(([seat, text]) => [seat, sha256(text)])).toEqual(Object.entries(hashes));
	});

	it("shows a resident the tools of the old game, in its order", () => {
		expect(econLabGame().grants?.resident).toEqual(["viewTable", "contribute", "offer", "respond", "choose", "readBrain", "writeBrain"]);
		expect(econLabGame({ brain: false }).grants?.resident).toEqual(["viewTable", "contribute", "offer", "respond", "choose"]);
		expect([econLabGame().locked, econLabGame({ brain: false }).locked]).toEqual([["contribute", "offer", "respond", "choose", "writeBrain"], ["contribute", "offer", "respond", "choose"]]);
	});

	it("keeps one id for every variant and the defaults of the old game", () => {
		// The old registry names (`econ-lab-nobrain`, `econ-lab-ultimatum`, `econ-lab-public-goods`, `econ-lab-dilemma`) are not carried: a variant is its options.
		for (const options of [{}, { brain: false }, { blocks: [{ game: "dilemma", rounds: 12 }] } as const]) expect(econLabGame(options).id).toBe("econ-lab");
		expect(DEFAULT_BLOCKS).toEqual([{ game: "ultimatum", rounds: 6 }, { game: "public-goods", rounds: 7 }, { game: "dilemma", rounds: 5 }]);
		// Ticks: (6 x 2 + 7 + 5) rounds x 2 for the deadline, 4 retro windows x 2, plus 4.
		expect(econLabGame()).toMatchObject({ seed: 23, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 24 * 2 + 4 * 2 + 4 }, limits: { maxCallsPerTick: 6 }, win: { fact: "econ-games.scores" } });
		expect(econLabGame({ blocks: [{ game: "public-goods", rounds: 12 }] }).end).toEqual({ ticks: 12 * 2 + 2 * 2 + 4 });
		expect(econLabGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});
});

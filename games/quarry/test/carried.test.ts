// SPDX-License-Identifier: Apache-2.0
/**
 * The byte-identity list of the game (specification of M2, section 7): the sha256 of the eight briefings (four seats,
 * with and without the brain), generated on the old platform (`quarryEntry({ brain }).briefing(seat)` at `v0-final`),
 * the tool names a resident is shown, in their order, and what replaces the old variant names.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import quarry, { quarryGame } from "../game.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [boolean, Readonly<Record<string, string>>])[] = [
	[true, { A01: "bc0f798df521b33a09bb51ab3bd44a3a4a627e50a6bfb8e807ed05e589cd3240", A02: "6536e0cab5ffbda06f1ee5716553fc086ae25deb005c97a57c9739c333d31acc", A03: "a64c8dbc7202f9af99b21cd3087601a6de6e26949e42d002f4bf78f440f62349", A04: "c816c67322e09c0de50b934f57961f0d31920b2fc0f58c383335ab82656647d6" }],
	[false, { A01: "6721139d0ed03f8f360d213562ff99c7b6dd4dcdfade97dcba90a446b06c5f9a", A02: "c2ae08d166bcabf8ebe1e8c3c6a8ee45f7e0fa829f740391b4e859e887102b0c", A03: "cd664b7b1b3371201b715231b4dd7a7601e3327e4b90f67b448f9fb6da13a32b", A04: "a4efc97970efb0b8e57728363fad933c2d186da84d2c0ce60066e06711fb5050" }],
];

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: brain %s", (brain, hashes) => {
		const briefing = quarryGame({ brain }).briefing;
		const texts = typeof briefing === "object" ? briefing : {};
		expect(Object.entries(texts).map(([seat, text]) => [seat, sha256(text)])).toEqual(Object.entries(hashes));
	});

	it("shows a resident the tools of the old game, in its order", () => {
		expect(quarryGame().grants?.resident).toEqual(["viewTable", "pick", "readBrain", "writeBrain"]);
		expect(quarryGame({ brain: false }).grants?.resident).toEqual(["viewTable", "pick"]);
		expect([quarryGame().locked, quarryGame({ brain: false }).locked]).toEqual([["pick", "writeBrain"], ["pick"]]);
	});

	it("keeps one id for every variant and the defaults of the old game", () => {
		// The old registry names (`quarry-nobrain`, `quarry-open`, `quarry-burn`, the alias `quarry-noburn`) are not carried: a variant is its options.
		for (const options of [{}, { brain: false }, { openHands: true }, { burns: true }]) expect(quarryGame(options).id).toBe("quarry");
		expect(quarry).toMatchObject({ seed: 29, residents: ["A01", "A02", "A03", "A04"], end: { ticks: 3 * 2 * 6 * 2 + 4 * 2 + 4 }, limits: { maxCallsPerTick: 6 }, win: { fact: "draft-rounds.scores" } });
		expect(quarryGame({ ticks: 9 }).end).toEqual({ ticks: 9 });
	});
});

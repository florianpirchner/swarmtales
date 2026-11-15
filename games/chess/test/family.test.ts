// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Chess as a game family (M4 specification, issue 32): the default params give the game of issue M4-29, the arm of
 * the requests series (section 7.2) and the other branches give the games of their old variants, every old variant
 * name is reached by params, and a param the family does not have, or the coach without the brain, is refused with
 * `SWT-G041`. The hashes were pinned on the plain game of `rewrite/develop` 0669176d, before the metrics were added.
 */
import { SwtError } from "@swarmtales/contracts";
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import chess, { chessFamily, chessGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-29 (`chessGame()`), taken before any change of this issue. */
const PINNED = "e0a208e465259af8d38d07462b35538da02351df78220b0dc61ebacb90366e2d";
/** The hashes of three more branches, taken the same way: `-fresh-compact-g4-p80` (the series arm), `-nobrain`, `-teams`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ games: 4, maxPlies: 80, fresh: true, compact: true }, "5a0b5a4b6e0bbfd9e6914eeeca0af10a9c7725bdac5c3e1af88ac910e1b7beb1"],
	[{ brain: false }, "ee5df2f383e51818f427cd9210d14a70214069917a29787c2a00131a3722fe00"],
	[{ teams: true }, "42fb84d50160ee5fcc2fcb445ced4e0415311ee0bb8a21155648d056fde82279"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(chessFamily, overrides);
	expect(issues).toEqual([]);
	return chessFamily.build(Value.Parse(chessFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(chess).toBe(chessFamily);
		expect(isGameFamily(chess)).toBe(true);
		expect(familyParams(chess).params).toEqual({ games: 2, maxPlies: 160, maxWords: 150, fresh: false, compact: false, brain: true, showLegalMoves: false, showThreats: false, coach: false, teams: false, settleCap: false });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(chessGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(chessGame(options)));
	});

	it("refuses a param it does not have, a value out of the old bounds, and the coach without the brain", () => {
		expect(familyParams(chess, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(chess, { maxPlies: 401 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(chess, { games: 0 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(() => arm({ coach: true, brain: false })).toThrow(SwtError);
		expect(() => arm({ coach: true, brain: false })).toThrow(/SWT-G041/);
	});
});

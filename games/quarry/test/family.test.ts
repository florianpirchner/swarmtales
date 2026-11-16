// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Quarry as a game family (specification of M2, sections 7.3 and 8.1): the default params give the game of issue
 * M2-13, each arm gives the game of its old variant, and the committed experiment specs name only params it has.
 * The hashes were pinned on the plain game, before the family was built.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import quarry, { quarryGame } from "../game.ts";
import { arm } from "./support.ts";

/** The hash of the plain game of issue M2-13 (`quarryGame()`), taken before any change of the game files. Pinned again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3). */
const PINNED = "a146fca086cc39a064d749efb973ebd6e154df7e5e1e9da15f7f7066ccb567a9";
/** The hashes of the old variants, taken the same way: `quarryGame({ openHands: true })`, `{ brain: false }`, `{ burns: true }`. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ openHands: true }, "f3d22de5d23cafcde94f447902c2b447bf47bef5027c7418e3b23c258c533c6e"],
	[{ brain: false }, "0fd15a237c706b4865bc8b28dd351add6ed41a7a1191f92f4a2600f6c5d889cb"],
	[{ burns: true }, "c3af0b74b0296fa22649a70052edef5c5d9829f3287912af40f607e64f006bf9"],
];
const EXPERIMENTS = join(import.meta.dirname, "..", "experiments");

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;

// The params of every arm of a committed spec.
function armsOf(file: string): readonly Readonly<Record<string, unknown>>[] {
	const spec: unknown = JSON.parse(readFileSync(join(EXPERIMENTS, file), "utf8"));
	const arms: unknown = typeof spec === "object" && spec !== null && "arms" in spec ? spec.arms : [];
	return Array.isArray(arms) ? arms.map((entry: unknown) => (typeof entry === "object" && entry !== null && "params" in entry && typeof entry.params === "object" ? { ...entry.params } : {})) : [];
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the specification", () => {
		expect(isGameFamily(quarry)).toBe(true);
		expect(familyParams(quarry).params).toEqual({ games: 3, packs: 2, packSize: 6, brain: true, burns: false, openHands: false, frozenHands: false, maxWords: 150, showResults: true });
	});

	it("gives the pinned game hash for the default params: the control arm", () => {
		expect(hashOf(quarryGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
		expect(hashOf(arm({ openHands: false, games: 3 }))).toBe(PINNED);
		expect(hashOf(arm({ frozenHands: false }))).toBe(PINNED);
	});

	it.each(ARMS)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("takes every arm of the committed experiment specs, and refuses a param it does not have", () => {
		const arms = readdirSync(EXPERIMENTS).flatMap(armsOf);
		expect(arms).toContainEqual({ openHands: true });
		expect(arms).toContainEqual({ openHands: true, frozenHands: true });
		expect(arms.flatMap((params) => familyParams(quarry, params).issues)).toEqual([]);
		expect(familyParams(quarry, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(quarry, { openHands: "yes" }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});

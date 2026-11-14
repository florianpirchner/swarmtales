// SPDX-License-Identifier: Apache-2.0
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

/** The hash of the plain game of issue M2-13 (`quarryGame()`), taken before any change of the game files. */
const PINNED = "6490b2a8e16e7dfaf9c4180004b0a5c3acb81183a95c5685a7b773e7689041c1";
/** The hashes of the old variants, taken the same way: `quarryGame({ openHands: true })`, `{ brain: false }`, `{ burns: true }`. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ openHands: true }, "f73235af367638ebb9514bb6790cc55629e4d4b6a4dc3e45bf827a2e327b1d44"],
	[{ brain: false }, "c478e181aa911c0a7ffbd7ed46e1e755173324418781718c4b6c3244456c177a"],
	[{ burns: true }, "55fb7c693d70867c23a5b15fcd1228e4a17aff6a46803ba12a675b60a98b3f46"],
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

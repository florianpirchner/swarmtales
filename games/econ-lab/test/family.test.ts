// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Econ Lab as a game family (specification of M2, sections 7.3 and 8.1): the default params give the game of issue
 * M2-14, each arm gives the game of its old variant, and the committed experiment specs name only params it has.
 * The hashes were pinned on the plain game, before the family was built.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import econLab, { econLabGame } from "../game.ts";
import { arm } from "./support.ts";

/** The hash of the plain game of issue M2-14 (`econLabGame()`), taken before any change of the game files. Pinned again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3). */
const PINNED = "4cb7ff3e344d795a9319247b259f4e49ce4ac85a6979b3144176a75332614f4d";
/** The hash of the old variant `econ-lab-nobrain`, taken the same way: `econLabGame({ brain: false })`. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [[{ brain: false }, "f102f6f5a8537a751413ecfa63926a06375bf371edeee9f1c9fe5eec041bfa23"]];
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
		expect(isGameFamily(econLab)).toBe(true);
		expect(familyParams(econLab).params).toEqual({ blocks: [{ game: "ultimatum", rounds: 6 }, { game: "public-goods", rounds: 7 }, { game: "dilemma", rounds: 5 }], brain: true, showHorizon: false, maxWords: 150, showResults: true });
	});

	it("gives the pinned game hash for the default params: the treatment arm", () => {
		expect(hashOf(econLabGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
		expect(hashOf(arm({ brain: true, showHorizon: false }))).toBe(PINNED);
	});

	it.each(ARMS)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("takes every arm of the committed experiment specs, and refuses a param it does not have", () => {
		const arms = readdirSync(EXPERIMENTS).flatMap(armsOf);
		expect(arms).toContainEqual({ brain: false });
		expect(arms).toContainEqual({ brain: false, showResults: false });
		expect(arms.flatMap((params) => familyParams(econLab, params).issues)).toEqual([]);
		expect(familyParams(econLab, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(econLab, { brain: "no" }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The residents' system prompts of the City (issue M5-86, decision A98): every seat plays a figure of the cast, and
 * the fact `motives.personas` gives it the persona of its figure's profession, as the old host did; `residentPrompts`
 * of the live run builds the old text from the game alone. The sha256 are those of the old prompts at `v0-final`
 * (`oracles/system-prompts.md`), for the dials of the oracle files.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { residentPrompts } from "@swarmtales/cli/src/resident-prompts.ts";
import { turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame } from "@swarmtales/sdk";
import { readOracle } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { CITY } from "../src/story.ts";
import { gameOf, ORACLES } from "./support.ts";

const texts = createPromptLookup();
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const Played = Type.Record(Type.String(), Type.Object({ figure: Type.String() }, { additionalProperties: true }), { description: "The core motive per resident, with its figure" });
const Named = Type.Record(Type.String(), Type.Object({ name: Type.String() }, { additionalProperties: true }), { description: "The persona per resident" });

// The prompts of a run of an oracle file's dials and seed, built as the live run builds them: after the kernel is created, before it starts.
function promptsOf(file: string) {
	const oracle = readOracle(join(ORACLES, file));
	const game = resolveGame({ game: gameOf(oracle), schedulers: { turns }, prompts: texts, seed: oracle.setup.seed });
	const kernel = createKernel(game.definition, {});
	return { prompts: residentPrompts(game, texts, kernel), kernel };
}

describe("the system prompts of the City (A98)", () => {
	it.each([
		["cityofkeys-act1-s7.json", "A01", "Gambler", "d589b0c57cbbf1b4818c3eac9fcb486b4fb62a61edfd3cca86c1b039ad5cf6f5"],
		["cityofkeys-act1-s11.json", "A01", "Recluse", "67c4e189244671103b28bab774bc47841c3980590e07c0f974a49ef1908afbcc"],
	])("%s seat %s (%s, its figure's profession) gets the old system prompt", (file, seat, persona, hash) => {
		const { prompts, kernel } = promptsOf(file);
		expect(kernel.fact("motives.personas")).toMatchObject({ [seat]: { name: persona } });
		expect(sha256(prompts[`resident:${seat}`] ?? "")).toBe(hash);
		// Dealing the personas writes nothing: the log is empty until the run starts.
		expect(kernel.log.all()).toEqual([]);
	});

	it.each(["cityofkeys-act1-s7.json", "cityofkeys-act1-s11.json"])("%s gives every seat the persona of the figure it plays", (file) => {
		const { kernel } = promptsOf(file);
		const played = Value.Parse(Played, kernel.fact("motives.coreMotives"));
		const personas = Value.Parse(Named, kernel.fact("motives.personas"));
		const professionOf = (figure: string): string | undefined => CITY.coreMotives.figures.find((entry) => entry.id === figure)?.profession;
		const expected = Object.fromEntries(Object.entries(played).map(([seat, entry]) => [seat, professionOf(entry.figure)]));
		expect(Object.fromEntries(Object.entries(personas).map(([seat, persona]) => [seat, persona.name.toLowerCase()]))).toEqual(expected);
	});
});

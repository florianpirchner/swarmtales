// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The residents' system prompts of Whispers (issue M5-82, decision A95): the game's `prompt` names the frame, the core
 * motive, the City, the persona `motives` deals by seat from the run seed (the old `assignPersonas`) and the
 * whisperer's brief, and `residentPrompts` of the live run builds the old text from the game alone. The sha256 are
 * those of the old prompts at `v0-final` (`oracles/system-prompts.md`), for the dials of the oracle files.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { residentPrompts } from "@swarmtales/cli/src/resident-prompts.ts";
import { turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame } from "@swarmtales/sdk";
import { readOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { whispersFamily } from "../game.ts";
import { whispersData } from "../src/story.ts";
import { gameOf, ORACLES } from "./support.ts";

const texts = createPromptLookup();
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

// The prompts of a run of an oracle file's dials and seed, built as the live run builds them: after the kernel is created, before it starts.
function promptsOf(file: string) {
	const oracle = readOracle(join(ORACLES, file));
	const game = resolveGame({ game: gameOf(oracle), schedulers: { turns }, prompts: texts, seed: oracle.setup.seed });
	const kernel = createKernel(game.definition, {});
	return { prompts: residentPrompts(game, texts, kernel), kernel };
}

const resolved = (params: Readonly<Record<string, boolean>>) => resolveGame({ game: whispersFamily, params, schedulers: { turns }, prompts: texts });

describe("the system prompts of Whispers (A95)", () => {
	it.each([
		["whispers-s7.json", "A01", "Archivist", "b097baf8e42338547dfb54d453e86cd3aef4ce5141387d233c759e8d8ebce9c9"],
		["whispers-s11.json", "A01", "Skeptic", "4aa066dbb7ef4c26529eb834f0bc8992e4ab574776c09027530274cbb9775de8"],
		["whispers-s7.json", "A06", "Merchant", "55112498e8001f97b77f7a8e8905a1371996334d083474c97e8699575fb31360"],
	])("%s seat %s (%s) gets the old system prompt", (file, seat, persona, hash) => {
		const { prompts, kernel } = promptsOf(file);
		expect(kernel.fact("motives.personas")).toMatchObject({ [seat]: { name: persona } });
		expect(sha256(prompts[`resident:${seat}`] ?? "")).toBe(hash);
		// Dealing the personas writes nothing: the log is empty until the run starts.
		expect(kernel.log.all()).toEqual([]);
	});

	it("gives the brief to the whisperer alone, and none in the control run", () => {
		const { prompts, kernel } = promptsOf("whispers-s7.json");
		const brief = whispersData(true).whisperer.brief.trim();
		expect(Object.entries(prompts).filter(([, text]) => text.endsWith(brief)).map(([id]) => id)).toEqual([`resident:${String(kernel.fact("whispers.whisperer"))}`]);
		const control = resolved({ whisperer: false });
		expect(Object.values(residentPrompts(control, texts, createKernel(control.definition, {}))).filter((text) => text.includes(brief))).toEqual([]);
	});

	it("names the names deadline with names, and plays without character and persona without core motives", () => {
		const named = resolved({});
		const plain = resolved({ names: false, coreMotives: false });
		expect(named.data.prompt?.city?.namesUntil).toBe(2);
		expect(plain.data.prompt).toMatchObject({ city: { name: "ECHO", survivors: whispersData(true).run.survivors, tools: "story" } });
		expect([plain.data.prompt?.city?.namesUntil, plain.data.prompt?.persona, plain.data.prompt?.character]).toEqual([undefined, undefined, undefined]);
		expect(Object.keys(residentPrompts(plain, texts, createKernel(plain.definition, {})))).toHaveLength(6);
	});
});

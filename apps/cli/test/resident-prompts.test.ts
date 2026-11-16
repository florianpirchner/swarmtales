// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The system prompts of M5-70 (decision A86). A game names its frame and the fact of the character in `prompt`; the
 * live run builds the prompts after the kernel is created and before it starts, when `motives` has dealt in `start`.
 * The City order of the old `baseSystemPrompt` is composed from the nine carried prompt files: the text of seat A01
 * of the Whispers and City setups (`oracles/whispers/setup/whispers.story.json`,
 * `oracles/cityofkeys/setup/cityofkeys.story.json`, seeds 7 and 11) and of the whisperer A06 of Whispers seed 7 has
 * the sha256 of the old prompt at `v0-final`, computed by the script of `oracles/system-prompts.md`. The persona is
 * the one the old run gave the seat (its `agent_profile`; the seeded assignment of personas is not carried). Since
 * M5-81 (decisions A89, A94) the game's `prompt` names the City, the persona and the whisperer's brief, and
 * `residentPrompts` builds the five texts from it alone.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createKernel } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { motives, MotivesOptions } from "@swarmtales/mechanic-motives";
import { whispers, WhispersOptions } from "@swarmtales/mechanic-whispers";
import { systemPrompt } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { turns } from "@swarmtales/engine";
import { defineGame, resolveGame, type Game } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { residentPrompts } from "../src/resident-prompts.ts";

const Text = Type.String();
const Story = Type.Object({
	city: Text,
	run: Type.Object({ survivors: Type.Integer() }),
	names: Type.Object({ untilMinute: Type.Integer() }),
	toolScope: Type.Optional(Text),
	personas: Type.Array(Type.Object({ name: Text, temperament: Text, values: Text, voice: Text })),
	coreMotives: Type.Object({ frame: Text }, { additionalProperties: true }),
	whisperer: Type.Optional(Type.Object({ brief: Text, forgery: Type.Boolean(), duty: Type.Unknown(), coreMotive: Type.Unknown() })),
});
type Story = Static<typeof Story>;

const storyOf = (game: string, file: string): Story => Value.Parse(Story, JSON.parse(readFileSync(new URL(`../../../oracles/${game}/setup/${file}.story.json`, import.meta.url), "utf8")));
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const texts = createPromptLookup();

// The setup as the old host composed it: `whispers` before `motives`, the story's catalogue, its whisperer's character; and the prompt fields.
function gameOf(story: Story, seed: number, prompt: Game["prompt"] = { frame: story.coreMotives.frame, character: "motives.prose" }) {
	const whisperer = story.whisperer;
	const own = whisperer === undefined ? {} : { whispererCoreMotive: whisperer.coreMotive, whisperer: {} };
	const options = Value.Parse(MotivesOptions, { noteTools: ["notify", "boardNote"], ...story.coreMotives, ...own });
	const told = whisperer === undefined ? [] : [whispers(Value.Parse(WhispersOptions, { whisperer: { forgery: whisperer.forgery, duty: whisperer.duty }, control: false, noteTools: ["notify", "boardNote"] }))];
	const game = defineGame({ id: "prompt-test", seed, residents: 6, mechanics: [ledger({ startPoints: 10 }), channels(), ...told, motives(options)], end: { ticks: 2 }, prompt });
	return resolveGame({ game, schedulers: { turns }, prompts: texts });
}

const Prose = Type.Record(Type.String(), Type.String());

describe("the resident prompts of a game with a character (A86)", () => {
	it("reads the character per resident before the kernel starts, after the frame and the neutral lines; the deal it reads is the one `motive_dealt` writes", () => {
		const story = storyOf("whispers", "whispers");
		const game = gameOf(story, 7);
		const kernel = createKernel(game.definition, {});
		const prompts = residentPrompts(game, texts, kernel);
		expect(kernel.log.all()).toEqual([]);
		const prose = Value.Parse(Prose, kernel.fact("motives.prose"));
		expect(prompts["resident:A01"]).toBe(`${story.coreMotives.frame.trim()}\n\n${systemPrompt({ id: "A01", passes: 1, briefing: "" }, texts)}\n\n${prose.A01 ?? ""}`);
		kernel.start();
		expect(kernel.fact("motives.prose")).toEqual(prose);
		expect(kernel.log.all().filter((event) => event.type === "motive_dealt").map((event) => Value.Parse(Type.Object({ agent: Text }, { additionalProperties: true }), event.payload).agent)).toEqual(Object.keys(prose));
	});

	it("leaves a game without `prompt` with the neutral prompt, and refuses a character fact that holds no text per resident (SWT-C032)", () => {
		const game = gameOf(storyOf("whispers", "whispers"), 7);
		const data = { ...game.data };
		delete data.prompt;
		const plain = { ...game, data };
		expect(residentPrompts(plain, texts, createKernel(game.definition, {}))["resident:A02"]).toBe(systemPrompt({ id: "A02", passes: 1, briefing: "" }, texts));
		const wrong = { ...game, data: { ...game.data, prompt: { character: "motives.coreMotives" } } };
		expect(() => residentPrompts(wrong, texts, createKernel(game.definition, {}))).toThrow("SWT-C032");
	});
});

describe("the City order of the old `baseSystemPrompt` from the game's `prompt` (A86, A89, A94)", () => {
	// Game, setup, seed, seat, the persona of its old `agent_profile`, whether it is the whisperer, the sha256 of its old system prompt at v0-final.
	it.each([
		["whispers", "whispers", 7, "A01", "Archivist", false, "b097baf8e42338547dfb54d453e86cd3aef4ce5141387d233c759e8d8ebce9c9"],
		["whispers", "whispers", 11, "A01", "Skeptic", false, "4aa066dbb7ef4c26529eb834f0bc8992e4ab574776c09027530274cbb9775de8"],
		["whispers", "whispers", 7, "A06", "Merchant", true, "55112498e8001f97b77f7a8e8905a1371996334d083474c97e8699575fb31360"],
		["cityofkeys", "cityofkeys", 7, "A01", "Gambler", false, "d589b0c57cbbf1b4818c3eac9fcb486b4fb62a61edfd3cca86c1b039ad5cf6f5"],
		["cityofkeys", "cityofkeys", 11, "A01", "Recluse", false, "67c4e189244671103b28bab774bc47841c3980590e07c0f974a49ef1908afbcc"],
	] as const)("composes %s/%s seed %i seat %s as v0-final did", (folder, file, seed, seat, personaName, plays, hash) => {
		const story = storyOf(folder, file);
		const found = story.personas.find((entry) => entry.name === personaName);
		const persona = found === undefined ? {} : { persona: { [seat]: { temperament: found.temperament, values: found.values, voice: found.voice } } };
		// Whispers plays without names and with the tools of its doors; the City with names and every tool.
		const city = { name: story.city, survivors: story.run.survivors, tools: story.toolScope === "story" ? "story" : "all", ...(story.whisperer === undefined ? { namesUntil: story.names.untilMinute } : {}) } as const;
		const brief = story.whisperer === undefined ? {} : { brief: { text: story.whisperer.brief, reader: "whispers.whisperer" } };
		const game = gameOf(story, seed, { frame: story.coreMotives.frame, character: "motives.prose", city, ...persona, ...brief });
		const kernel = createKernel(game.definition, {});
		const prompts = residentPrompts(game, texts, kernel);
		const whisperer = story.whisperer === undefined ? undefined : kernel.fact("whispers.whisperer");
		expect([seat === whisperer, sha256(prompts[`resident:${seat}`] ?? "")]).toEqual([plays, hash]);
		// Only the reader of the brief reads it.
		const readers = Object.values(prompts).filter((text) => story.whisperer !== undefined && text.endsWith(story.whisperer.brief.trim()));
		expect(readers).toHaveLength(story.whisperer === undefined ? 0 : 1);
	});

	it("refuses a persona or brief-reader fact that holds no persona per resident or no resident id (SWT-C033)", () => {
		const story = storyOf("whispers", "whispers");
		for (const prompt of [{ persona: "motives.prose" }, { brief: { text: "x", reader: "motives.prose" } }]) {
			const game = gameOf(story, 7, prompt);
			expect(() => residentPrompts(game, texts, createKernel(game.definition, {}))).toThrow("SWT-C033");
		}
	});
});

/**
 * Golden runs: scripted offline runs whose normalised event logs and opening system prompts are
 * compared with stored files (docs/ideas/monorepo.md §6). They guard behaviour across the
 * rewrite; see test/golden/README.md.
 */
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, createFixture, say, type FixtureOptions } from "../helpers/fixture.ts";
import { goldenEvents, goldenPrompts } from "../helpers/golden.ts";
import { cityScript, gamemakerSteps, grudgeAddenda, whispersCast, whispersScript } from "./scripts.ts";

const SEED = 7;

async function playsGolden(name: string, options: FixtureOptions): Promise<void> {
	const fixture = createFixture(options);
	const prompts = goldenPrompts(name, Object.fromEntries(fixture.runners.map((runner) => [runner.id, runner.systemPrompt])));
	await fixture.run();
	const events = goldenEvents(name, fixture.log.events);
	expect(events.actual.length).toBeGreaterThan(100);
	expect(events.actual).toEqual(events.expected);
	expect(prompts.actual).toEqual(prompts.expected);
}

describe("golden runs", () => {
	it.each([
		["cityofkeys-f4g4", 4],
		["cityofkeys-f10g10", 10],
	])("%s: cityofkeys, 6 residents, 12 minutes", async (name, direction) => {
		await playsGolden(name, {
			story: cityOfKeys,
			agents: 6,
			minutes: 12,
			seed: SEED,
			names: true,
			figureDirection: direction,
			gmDirection: direction,
			script: cityScript,
			gamemakerScript: (world) => gamemakerSteps(world, 12, (minute) => (minute === 6 ? act({ name: "postBoard", args: { text: "The city is watching who shares." } }) : undefined)),
		});
	}, 120_000);

	it("whispers-f10-grudge: directed whisperer and the grudge addendum, 6 residents, 20 minutes", async () => {
		// The whisperer is drawn from the seed; a one-minute probe run tells who he is.
		const probe = createFixture({ story: whispers, seed: SEED, minutes: 1, script: (world) => Object.fromEntries(world.competitors.map((id) => [id, [say()]])) });
		const whisperer = whispersCast(probe.world).whisperer;
		await playsGolden("whispers-f10-grudge", {
			story: whispers,
			seed: SEED,
			minutes: 20,
			figureDirection: 10,
			promptAddenda: grudgeAddenda(whisperer, probe.world.competitors),
			script: whispersScript,
			gamemakerScript: (world) =>
				gamemakerSteps(world, 20, (minute) => {
					if (minute !== 13) return undefined;
					const { whisperer: chosen, victim, favourite } = whispersCast(world);
					return act({ name: "notify", args: { agent: chosen, text: `Sow doubt in ${victim} about ${favourite}'s vote.` } });
				}),
		});
	}, 120_000);
});

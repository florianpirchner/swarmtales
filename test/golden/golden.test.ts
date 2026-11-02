/**
 * Golden runs: scripted offline runs whose normalised event logs and opening system prompts are
 * compared with stored files (docs/ideas/monorepo.md §6). They guard behaviour across the
 * rewrite; see test/golden/README.md.
 *
 * Since step 18 they run on the new host (`composeHostRun`, the CLI's path): every line, the
 * gamemaker's included, and every resident's opening system prompt must equal the files the old
 * engine recorded.
 */
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, createHostFixture, say, type HostFixtureOptions } from "../helpers/host-fixture.ts";
import { goldenEvents, goldenPrompts } from "../helpers/golden.ts";
import { cityScript, gamemakerSteps, grudgeAddenda, whispersCast, whispersScript } from "./host-scripts.ts";

const SEED = 7;

async function playsGolden(name: string, options: HostFixtureOptions): Promise<void> {
	const fixture = createHostFixture(options);
	const prompts = goldenPrompts(name, Object.fromEntries(fixture.residents.prompts));
	await fixture.run();
	const events = goldenEvents(name, fixture.log.events);
	expect(events.actual.length).toBeGreaterThan(100);
	expect(events.actual).toEqual(events.expected);
	expect(prompts.actual).toEqual(prompts.expected);
}

describe("golden runs on the host", () => {
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
			gamemakerScript: (host) => gamemakerSteps(host, 12, (minute) => (minute === 6 ? act({ name: "postBoard", args: { text: "The city is watching who shares." } }) : undefined)),
		});
	}, 120_000);

	it("whispers-f10-grudge: directed whisperer and the grudge addendum, 6 residents, 20 minutes", async () => {
		// The whisperer is drawn from the seed; a composed (not played) run tells who he is.
		const probe = createHostFixture({ story: whispers, seed: SEED, minutes: 1, script: (host) => Object.fromEntries(host.residents.map((id) => [id, [say()]])) });
		const whisperer = whispersCast(probe.host).whisperer;
		await playsGolden("whispers-f10-grudge", {
			story: whispers,
			seed: SEED,
			minutes: 20,
			figureDirection: 10,
			promptAddenda: grudgeAddenda(whisperer, probe.host.residents),
			script: whispersScript,
			gamemakerScript: (host) =>
				gamemakerSteps(host, 20, (minute) => {
					if (minute !== 13) return undefined;
					const { whisperer: chosen, victim, favourite } = whispersCast(host);
					return act({ name: "notify", args: { agent: chosen, text: `Sow doubt in ${victim} about ${favourite}'s vote.` } });
				}),
		});
	}, 120_000);
});

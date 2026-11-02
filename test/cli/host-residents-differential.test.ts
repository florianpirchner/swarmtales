/**
 * Old against new for what the resident runner builds before the first turn (step 18, team R1):
 * for many dials of both stories, the old composer (`composeRun` on `World`) and the host runner
 * (`hostResidents` on `hostStoryOf`) give every resident the same system prompt, the same profile
 * (model and persona), the same character text for the weaver, the same thinking level and the
 * same tool declarations the model sees from the start, in the same order. The three goldens pin
 * three of these runs byte for byte (host-runner-golden.test.ts); this covers the dials around them.
 */
import { describe, expect, it } from "vitest";
import type { AnyStory } from "@swarmtales/contracts";
import { ScriptedModelSource } from "@swarmtales/models";
import { composeRun, type RunOverrides } from "../../apps/cli/src/compose.ts";
import { hostResidents } from "../../apps/cli/src/host/residents.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { hostRunOf, startedHost, withRivals } from "./support/host-residents.ts";

interface Case {
	readonly name: string;
	readonly story: AnyStory;
	readonly overrides: RunOverrides;
	readonly addenda?: readonly { readonly agent?: string; readonly text: string }[];
}

const DIALS: readonly Pick<RunOverrides, "figureDirection" | "gmDirection" | "gamemaker">[] = [0, 4, 6, 8, 10].flatMap((figureDirection) =>
	[4, 10].flatMap((gmDirection) => [true, false].map((gamemaker) => ({ figureDirection, gmDirection, gamemaker }))),
);

const RIVALLED = withRivals(cityOfKeys);

const CASES: readonly Case[] = [
	...[cityOfKeys, whispers].flatMap((story) => DIALS.map((dials): Case => ({ name: `${story.id} ${JSON.stringify(dials)}`, story, overrides: { ...dials, seed: 7 } }))),
	...[8, 10].map((figureDirection): Case => ({ name: `cityofkeys with rivals, 12 residents, figure ${String(figureDirection)}`, story: RIVALLED, overrides: { agents: 12, figureDirection, gmDirection: 10, gamemaker: true } })),
	...[4, 10].map((figureDirection): Case => ({ name: `cityofkeys without personas, figure ${String(figureDirection)}`, story: cityOfKeys, overrides: { personas: false, figureDirection } })),
	{ name: "whispers without personas", story: whispers, overrides: { personas: false, figureDirection: 4 } },
	{ name: "cityofkeys without core motives", story: cityOfKeys, overrides: { coreMotives: false, figureDirection: 10, gmDirection: 10, gamemaker: true } },
	{ name: "cityofkeys without names", story: cityOfKeys, overrides: { names: false, figureDirection: 8 } },
	{ name: "cityofkeys, seed 3, two passes", story: cityOfKeys, overrides: { seed: 3, passesPerMinute: 2, figureDirection: 6 } },
	{ name: "cityofkeys, 12 residents", story: cityOfKeys, overrides: { agents: 12, figureDirection: 10, gamemaker: true } },
	{ name: "whispers, control run", story: whispers, overrides: { whisperer: false, figureDirection: 10, gamemaker: true } },
	{ name: "whispers, seed 11", story: whispers, overrides: { seed: 11, figureDirection: 10, gamemaker: true } },
	// A later door that lists a tool nobody has open at the start: a story-scoped resident sees it declared from the start.
	{ name: "whispers with a later door that opens signPetition", story: { ...whispers, levels: whispers.levels.map((level) => (level.number < 2 ? level : { ...level, tools: [...level.tools, "signPetition"] })) }, overrides: { figureDirection: 4 } },
	{ name: "whispers with an addendum for all and one for A02", story: whispers, overrides: { figureDirection: 10 }, addenda: [{ text: "  Everyone hears this.  " }, { agent: "A02", text: "Only A02 hears this." }] },
];

const noModels = new ScriptedModelSource({});

function oldSide(entry: Case) {
	const composed = composeRun({
		story: entry.story,
		overrides: { stopWhenDone: false, stopWhenSeatsDecided: false, ...entry.overrides },
		models: noModels,
		gamemakerModels: noModels,
		sinks: [],
		...(entry.addenda === undefined ? {} : { promptAddenda: entry.addenda }),
	});
	return {
		effective: composed.effective,
		ids: composed.world.competitors,
		prompts: composed.runners.map((runner) => [runner.id, runner.systemPrompt]),
		profiles: composed.profiles.map((profile) => ({ agent: profile.agent, model: profile.model, persona: profile.persona?.name })),
		tools: composed.runners.map((runner) => [runner.id, runner.boundTools]),
	};
}

function newSide(entry: Case, old: ReturnType<typeof oldSide>) {
	const run = hostRunOf(old.effective, old.ids);
	const host = startedHost(entry.story, run);
	const residents = hostResidents({
		story: entry.story,
		run,
		host,
		models: noModels,
		personas: old.effective.personas,
		...(entry.addenda === undefined ? {} : { promptAddenda: entry.addenda }),
	});
	return {
		prompts: [...residents.prompts],
		profiles: residents.profiles.map((profile) => ({ agent: profile.agent, model: profile.model, persona: profile.persona?.name })),
		tools: host.residents.map((id) => [id, residents.runner(id)?.boundTools]),
	};
}

describe("the host resident runner against the old composer, before the first turn", () => {
	it.each(CASES.map((entry) => [entry.name, entry] as const))("%s: the same system prompts and profiles", (_name, entry) => {
		const old = oldSide(entry);
		const fresh = newSide(entry, old);
		expect(fresh.prompts).toEqual(old.prompts);
		expect(fresh.profiles).toEqual(old.profiles);
	});

	it.each(CASES.map((entry) => [entry.name, entry] as const))("%s: the same tool declarations from the start", (_name, entry) => {
		const old = oldSide(entry);
		const fresh = newSide(entry, old);
		// The one known difference (S18-7, G1-4, request R1-1): a run without names grants no
		// `chooseName`, so its model no longer sees the declaration the old engine bound but never opened.
		const expected = old.effective.names || entry.story.names === undefined ? old.tools : old.tools.map(([id, tools]) => [id, Array.isArray(tools) ? tools.filter((tool) => tool !== "chooseName") : tools]);
		expect(fresh.tools).toEqual(expected);
	});

	it("faces no rival who is no longer in the city (an exiled or struck resident, as the old `world.alive`)", () => {
		const entry: Case = { name: "cityofkeys with rivals, 12 residents, figure 10", story: RIVALLED, overrides: { agents: 12, figureDirection: 10, seed: 7 } };
		const old = oldSide(entry);
		const run = hostRunOf(old.effective, old.ids);
		const host = startedHost(entry.story, run);
		const all = hostResidents({ story: entry.story, run, host, models: noModels });
		const rivalLine = /^- (A\d\d): /m;
		const named = [...all.prompts].flatMap(([, prompt]) => {
			const found = rivalLine.exec(prompt);
			return found?.[1] === undefined ? [] : [found[1]];
		});
		const gone = named[0];
		if (gone === undefined) throw new Error("no rival line at figure direction 10");
		for (const key of ["exile.exiled", "standoff-tribunal.struck"] as const) {
			const value = key === "exile.exiled" ? [{ resident: gone, by: "tribunal" }] : [gone];
			const view = new Proxy(host, {
				get(target, property) {
					if (property === "facts") return () => ({ ...target.facts(), [key]: value });
					const member: unknown = Reflect.get(target, property, target);
					if (typeof member !== "function") return member;
					// The host's methods read its private fields: call them on the host itself.
					return (...args: unknown[]): unknown => Reflect.apply(member, target, args);
				},
			});
			const without = hostResidents({ story: entry.story, run, host: view, models: noModels });
			for (const [id, prompt] of without.prompts) expect({ id, faces: prompt.includes(`- ${gone}: `) }).toEqual({ id, faces: false });
			expect([...without.prompts].filter(([id, prompt]) => all.prompts.get(id) !== prompt).length).toBeGreaterThan(0);
		}
	});
});

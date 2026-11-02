/**
 * Differential tests of the gamemaker overseer against the old role (step 18, team C2): the same old
 * run, the same moment, the same events; the overseer's call input must be the old
 * `gamemaker_turn.input` byte for byte, look for look (shadow.ts). The runs are the three golden runs
 * (City of Keys at direction 4 and 10, Whispers with the grudge) and the holdout tribunal of Whispers
 * v3, whose tribunal lines are notes "to tribunal" shown on the board.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { AnyStory } from "@swarmtales/contracts";
import { directionLevel, type World } from "@swarmtales/engine";
import type { GamemakerOverseerOptions } from "@swarmtales/roles";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { act, createFixture, say, type FixtureOptions } from "../../helpers/fixture.ts";
import { cityScript, gamemakerSteps, grudgeAddenda, whispersCast, whispersScript } from "../../golden/scripts.ts";
import { shadowRun, type ShadowLook } from "./shadow.ts";

const SEED = 7;

/** The overseer's options for a story's gamemaker at a direction (the budgets and the cadence of its spec). */
function optionsOf(story: AnyStory, direction: number): (world: World) => Partial<GamemakerOverseerOptions> {
	const spec = story.gamemaker;
	if (spec === undefined) throw new Error(`${story.id} has no gamemaker`);
	return () => ({ every: spec.every, direction: directionLevel(direction), notesPerAgent: spec.notesPerAgent, boardPosts: spec.boardPosts, windowMinutes: spec.windowMinutes });
}

function expectSameLooks(looks: readonly ShadowLook[], count: number): void {
	expect(looks.length).toBe(count);
	for (const look of looks) expect({ round: look.round, input: look.overseer }).toEqual({ round: look.round, input: look.old });
}

/** The holdout run of test/gamemaker/holdout.test.ts: A01 holds door 1, the gamemaker calls, announces and strikes. */
function holdoutResidents(world: World): Record<string, FauxResponseStep[]> {
	const opens = world.opensAt(1);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of world.competitors) {
		script[id] = Array.from({ length: 12 }, (): FauxResponseStep => () => {
			const minute = world.minute;
			const others = world.competitors.filter((other) => other !== id);
			if (minute === opens && id !== "A01") return act(...others.map((target) => ({ name: "sendDM", args: { target, message: `Door 1, mine: ${world.inspect.fragmentOf(id, 1)}` } })));
			if (minute === opens + 1 && id === "A01") return act({ name: "submitSolution", args: { level: 1, code: world.inspect.passwordOf(id, 1) } });
			if (minute === opens + 6 && id !== "A01") return act({ name: "tribunalVote", args: { yes: true } });
			return say();
		});
	}
	return script;
}

function holdoutPlan(): (minute: number) => AssistantMessage | undefined {
	return (minute) => {
		if (minute === 2) return act({ name: "notify", args: { agent: "A02", text: "A02, keep an eye on the door." } }, { name: "postBoard", args: { text: "The city keeps count." } });
		if (minute === 3) {
			return act(
				{ name: "callTribunal", args: { accused: ["A02"], reason: "A02 holds the city." } },
				{ name: "callTribunal", args: { accused: ["A01"], reason: "A01 passed door 1 and keeps the city waiting." } },
				{ name: "notify", args: { agent: "A03", text: "A03, the tribunal sits." } },
			);
		}
		if (minute === 6) return act({ name: "announceTribunal", args: { text: "A01 let the grace pass. The vote is open." } });
		if (minute === 8) return act({ name: "permaDeath", args: { agent: "A01", reason: "Every voter said yes. A01 leaves the city." } }, { name: "postBoard", args: { text: "One fewer." } });
		return undefined;
	};
}

describe("the gamemaker overseer in the shadow of the old role", () => {
	it.each([4, 10])("City of Keys at direction %i: every look's input equals the old one", async (direction) => {
		const fixture: FixtureOptions = {
			story: cityOfKeys,
			agents: 6,
			minutes: 12,
			seed: SEED,
			names: true,
			figureDirection: direction,
			gmDirection: direction,
			script: cityScript,
			gamemakerScript: (world) => gamemakerSteps(world, 12, (minute) => (minute === 6 ? act({ name: "postBoard", args: { text: "The city is watching who shares." } }) : undefined)),
		};
		const run = await shadowRun(fixture, optionsOf(cityOfKeys, direction));
		expectSameLooks(run.looks, 11);
		// The looks carry what the overseer itself keeps: the note, the budget, the residents' tracks.
		expect(run.looks.at(-1)?.overseer).toContain('- minute 6 to board: "The city is watching who shares."');
		expect(run.looks.at(-1)?.overseer).toMatch(/last acted minute 10/);
	}, 120_000);

	it("Whispers with the grudge: every look's input equals the old one", async () => {
		const probe = createFixture({ story: whispers, seed: SEED, minutes: 1, script: (world) => Object.fromEntries(world.competitors.map((id) => [id, [say()]])) });
		const whisperer = whispersCast(probe.world).whisperer;
		const fixture: FixtureOptions = {
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
		};
		const run = await shadowRun(fixture, optionsOf(whispers, 4));
		expectSameLooks(run.looks, 19);
		expect(run.looks.at(-1)?.overseer).toContain("(thinking aloud, private)");
	}, 120_000);

	it("the holdout tribunal: tribunal lines count apart from the board; the state survives its slice", async () => {
		const fixture: FixtureOptions = {
			story: whispers,
			agents: 6,
			minutes: 11,
			script: holdoutResidents,
			gamemakerScript: (world) => gamemakerSteps(world, 11, holdoutPlan()),
		};
		const run = await shadowRun(fixture, optionsOf(whispers, 4));
		expectSameLooks(run.looks, 10);
		const last = run.looks.at(-1)?.overseer ?? "";
		expect(last).toContain('to tribunal: "A01 passed door 1 and keeps the city waiting."');
		expect(last).toContain('to tribunal: "Every voter said yes. A01 leaves the city."');
		expect(last).toContain('to board: "One fewer."');
		// A resumed overseer (a fresh instance loaded from the slice) makes the very look the running one makes.
		const slice = run.instance.snapshot;
		const fresh = run.fork();
		if (slice === undefined || fresh.snapshot === undefined) throw new Error("no slice");
		const saved: unknown = JSON.parse(JSON.stringify(slice.save()));
		expect(JSON.stringify(saved)).toContain('"to":"tribunal"');
		fresh.snapshot.load(saved, 1);
		const look = { kind: "schedule", minute: run.world.minute } as const;
		expect(fresh.calls(look)).toEqual(run.instance.calls(look));
		expect(fresh.snapshot.save()).toEqual(slice.save());
	}, 120_000);
});

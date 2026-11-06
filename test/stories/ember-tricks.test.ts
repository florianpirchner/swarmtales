/** The Ember Tricks story through the real mechanics: a scripted two-game match with notes, offline (docs/ideas/game-roadmap.md §2.3). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, playStory } from "@swarmtales/testkit";
import { emberTricksStory } from "../../stories/ember-tricks/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType, trickPlayer } from "../mechanics/trick-play/support.ts";

const notes = (resident: string, game: number): string => `${resident} after game ${String(game)}: bid one trick per ace-high card, name the suit I hold most of as trump, keep the veto for a long suit lead.`;

function story(options: Parameters<typeof emberTricksStory>[0] = {}): CoreStory {
	const base = emberTricksStory({ rounds: [1, 2, 3], ...options });
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (brain = true) => ({ story: story({ brain }), prompts: createPromptLookup() });

/** The context-reset lines each resident got, in order. */
function resets(events: readonly EventEnvelope[]): { readonly resident: string; readonly text: string }[] {
	return events
		.filter((event) => event.type === "turn_started")
		.flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: String(field(event, "resident")), text: input.text })) : [];
		});
}

describe("ember-tricks, scripted match", () => {
	it("plays two games, every seat writes its notes after game 1 and reads them in game 2", async () => {
		const run = await playStory(options(), trickPlayer({ notes }));
		expect(run.end).toMatchObject({ reason: "referee", limit: "trick-play.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => `${String(field(event, "team"))} ${String(field(event, "game"))}`).sort()).toEqual(["A01 1", "A02 1", "A03 1", "A04 1"]);
		expect(written.every((event) => event.audience?.join() === "human")).toBe(true);
		// Game 2's briefing (in every round) carries the seat's own notes, never another seat's.
		const late = resets(run.events).filter((reset) => reset.text.includes("Game 2 begins"));
		expect(late.length).toBeGreaterThanOrEqual(4 * 3 - 1);
		for (const reset of late) {
			expect(reset.text).toContain(notes(reset.resident, 1));
			expect(reset.text.match(/after game 1:/g)).toHaveLength(1);
		}
		// The debrief of game 1 reached every seat in the retro.
		const debriefs = run.events.filter((event) => event.type === "turn_started" && JSON.stringify(field(event, "inputs")).includes("Bid/taken per round"));
		expect(new Set(debriefs.map((event) => field(event, "resident"))).size).toBe(4);
	});

	it("resets every seat at each round, so a conversation never spans two rounds", async () => {
		const run = await playStory(options(), trickPlayer({ notes }));
		const firstGame = resets(run.events).filter((reset) => reset.text.includes("Game 1 begins"));
		// Three rounds, four seats; a seat that has no turn in a round is reset at its next one.
		expect(firstGame.length).toBeGreaterThanOrEqual(9);
		expect(firstGame.every((reset) => reset.text.includes("not written a brain yet"))).toBe(true);
	});

	it("keeps no notes and opens no retro in the control arm", async () => {
		const run = await playStory(options(false), trickPlayer({ notes }));
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(resets(run.events).every((reset) => reset.text.includes("keep no notes"))).toBe(true);
	});

	it("gives the same events for the same seed and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(() => options(), () => trickPlayer({ notes }))).toEqual([]);
		expect(await checkSnapshotRoundTrip(() => options(), () => trickPlayer({ notes }), 2)).toEqual([]);
	});
});

describe("ember-tricks names", () => {
	it("resolves the registered arms and the combinations by name", () => {
		expect(findCoreStory("ember-tricks")?.story.id).toBe("ember-tricks");
		expect(findCoreStory("ember-tricks-nobrain")?.story.id).toBe("ember-tricks-nobrain");
		expect(findCoreStory("ember-tricks-g2-r4")?.story.id).toBe("ember-tricks-r4");
		expect(findCoreStory("ember-tricks-nobrain-g5")?.story.id).toBe("ember-tricks-nobrain-g5");
		expect(findCoreStory("ember-tricks-r11")).toBeUndefined();
		expect(findCoreStory("ember-tricks-g0")).toBeUndefined();
	});
});

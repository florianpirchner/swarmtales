/** The Harbor Lights story through the real mechanics: scripted matches of the three arms, offline. */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope } from "@swarmtales/contracts";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, playStory } from "@swarmtales/testkit";
import { harborLightsStory } from "../../stories/harbor-lights/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { towerPlayer } from "../mechanics/hint-towers/support.ts";

const notes = (resident: string, game: number): string => `${resident} after game ${String(game)}: the newest card a signal touches is playable; discard the oldest untouched slot.`;
const post = (resident: string): string => `${resident}: let us agree that a signal points at a playable card.`;

function story(options: Parameters<typeof harborLightsStory>[0] = {}): CoreStory {
	const base = harborLightsStory({ games: 2, ...options });
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const ofType = (events: readonly EventEnvelope[], type: string): readonly EventEnvelope[] => events.filter((event) => event.type === type);
function field(event: EventEnvelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The context-reset lines each resident got, in order. */
function resets(events: readonly EventEnvelope[]): { readonly resident: string; readonly text: string }[] {
	return ofType(events, "turn_started").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: String(field(event, "resident")), text: input.text })) : [];
	});
}

describe("harbor-lights, scripted matches", () => {
	it("crew: talks only between games, one captain writes the shared brain and everyone reads it", async () => {
		const run = await playStory({ story: story(), prompts: createPromptLookup() }, towerPlayer({ notes, post }));
		expect(run.end).toMatchObject({ reason: "referee", limit: "hint-towers.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => `${String(field(event, "team"))} ${String(field(event, "game"))}`)).toEqual(["crew 0", "crew 1"]);
		const posts = ofType(run.events, "team_post");
		expect(posts.length).toBeGreaterThan(0);
		// Every post falls between games: after a game's end and before the next game's start, or before game 1.
		const starts = ofType(run.events, "game_started").map((event) => event.seq);
		const ends = ofType(run.events, "game_ended").map((event) => event.seq);
		for (const event of posts) {
			const inside = starts.some((start, index) => event.seq > start && event.seq < (ends[index] ?? Infinity));
			expect(inside).toBe(false);
		}
		const last = written[1];
		if (last === undefined) throw new Error("no brain after game 1");
		const author = String(field(last, "author"));
		const late = resets(run.events).filter((reset) => reset.text.includes("Game 2 begins"));
		expect(late.length).toBe(4);
		for (const reset of late) expect(reset.text).toContain(notes(author, 1));
	});

	it("crew: the record after a game asks the retro what a signal means and names every discard; soft strikes (the default) tell the seats the penalty", async () => {
		const run = await playStory({ story: story(), prompts: createPromptLookup() }, towerPlayer({ notes, post }));
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		const texts = ofType(run.events, "turn_started").map((event) => JSON.stringify(field(event, "inputs")));
		expect(texts.some((text) => text.includes("Retro question: agree in the chat what a signal means"))).toBe(true);
		expect(texts.some((text) => text.includes("soft strikes: from strike 2 on"))).toBe(true);
		expect(texts.some((text) => text.includes("Discarded, each still needed and each one point lost"))).toBe(true);
		const hard = await playStory({ story: story({ strikes: "hard" }), prompts: createPromptLookup() }, towerPlayer({ notes, post }));
		expect(ofType(hard.events, "turn_started").some((event) => JSON.stringify(field(event, "inputs")).includes("(the last one ends the game)"))).toBe(true);
	});

	it("solo: every seat writes private notes and reads only its own", async () => {
		const run = await playStory({ story: story({ brain: "solo" }), prompts: createPromptLookup() }, towerPlayer({ notes, post }));
		expect(ofType(run.events, "team_post")).toHaveLength(0);
		expect(ofType(run.events, "brain_written").map((event) => String(field(event, "team"))).sort()).toEqual(["A01", "A01", "A02", "A02", "A03", "A03", "A04", "A04"]);
		for (const reset of resets(run.events).filter((entry) => entry.text.includes("Game 2 begins"))) {
			expect(reset.text).toContain(notes(reset.resident, 1));
			expect(reset.text.match(/after game 1:/g)).toHaveLength(1);
		}
	});

	it("nobrain: keeps nothing and opens no retro", async () => {
		const run = await playStory({ story: story({ brain: "nobrain" }), prompts: createPromptLookup() }, towerPlayer({ notes }));
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
	});

	it("plays the same deals in every arm (the same seed)", async () => {
		const deals = async (brain: "crew" | "solo" | "nobrain") => ofType((await playStory({ story: story({ brain }), prompts: createPromptLookup() }, towerPlayer({ notes, post }))).events, "deal_revealed").map((event) => JSON.stringify(field(event, "pile")));
		const crew = await deals("crew");
		expect(await deals("solo")).toEqual(crew);
		expect(await deals("nobrain")).toEqual(crew);
	});

	it("is deterministic and survives a snapshot", async () => {
		const options = { story: story(), prompts: createPromptLookup() };
		expect(await checkDeterminism(options, () => towerPlayer({ notes, post }))).toEqual([]);
		expect(await checkSnapshotRoundTrip(options, () => towerPlayer({ notes, post }), 4)).toEqual([]);
	});

	it("is registered under its names", () => {
		expect(findCoreStory("harbor-lights")?.story.id).toBe("harbor-lights");
		expect(findCoreStory("harbor-lights-solo")?.story.id).toBe("harbor-lights-solo");
		expect(findCoreStory("harbor-lights-nobrain-g2")?.story.id).toBe("harbor-lights-nobrain-g2");
		expect(findCoreStory("harbor-lights-hard-strikes")?.story.id).toBe("harbor-lights-hard-strikes");
		expect(findCoreStory("harbor-lights-solo-hard-strikes-g2")?.story.id).toBe("harbor-lights-solo-hard-strikes-g2");
		expect(findCoreStory("harbor-lights-soft-strikes")).toBeUndefined();
		expect(findCoreStory("harbor-lights-g0")).toBeUndefined();
	});
});

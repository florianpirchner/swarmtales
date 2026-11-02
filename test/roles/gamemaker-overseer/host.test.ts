/**
 * The gamemaker overseer on the new host (step 18, team C2): the golden logs replayed on the real
 * city with the arena (test/mechanics/arena/golden-host.ts), where the gamemaker is no longer
 * driven by the app's `between` but runs as the overseer `gamemaker` with its real runtime
 * (`gamemakerRuntime`) on the golden run's scripted model (the same faux steps as
 * test/golden/scripts.ts, `gamemakerSteps`). The report's city part is the golden's own
 * `gamemaker_turn.input` of that round (no old `World` exists on this host); what the overseer adds
 * to it (its notes, the budget line) is checked against the golden text.
 *
 * Proof: every line of the golden log outside the app, and every gamemaker line of the app
 * (`gamemaker_turn`, `_text`, `_call`, `_result`, the `usage` of `GM`), equals the golden's in order.
 * The usage lines carry the faux model's token counts of the system prompt, the tool list and the
 * input, so on City of Keys at direction 4 (the old look offered exactly `notify` and `postBoard`)
 * they pin the bytes the model saw; at direction 10 and in Whispers the old look also offered the
 * ultimatum and the holdout tools, whose mechanics this replay does not load, so there the usage
 * lines are compared without their token counts.
 */
import type { FauxResponseStep, JsonObject, JsonValue } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { legacyOwner, legacySink } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { act, say, ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineGamemaker, GAMEMAKER_APP_EVENTS, GAMEMAKER_ID, gamemakerRuntime, type GamemakerLook, type GamemakerReport } from "@swarmtales/roles";
import type { LegacyLine } from "@swarmtales/testkit";
import { fileURLToPath } from "node:url";
import { directionLevel } from "@swarmtales/engine";
import { DEFAULT_LIMITS } from "../../../apps/cli/src/compose.ts";
import { arenaStoryOf } from "../../mechanics/arena/golden-host.ts";
import { storyOf, type GoldenName } from "../../mechanics/puzzles/harness.ts";
import { turnKey } from "../../mechanics/t2/golden-plan.ts";
import { REPLAYED } from "../../mechanics/script/golden-host.ts";

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
	if (Array.isArray(value)) return value.every(isJsonValue);
	return isJsonObject(value);
}

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isJsonValue);
}

const replayed = (tool: string): boolean => REPLAYED.some((name) => name === tool);

interface Case {
	readonly name: GoldenName;
	readonly direction: number;
	/** The golden gamemaker's one call: at this minute, this tool with these arguments. */
	readonly minute: number;
	readonly call: (golden: readonly LegacyLine[]) => { readonly name: string; readonly args: JsonObject };
	/** Whether the old look's tools were exactly the ones this replay loads (`notify`, `postBoard`). */
	readonly sameTools: boolean;
}

const CASES: readonly Case[] = [
	{ name: "cityofkeys-f4g4", direction: 4, minute: 6, call: () => ({ name: "postBoard", args: { text: "The city is watching who shares." } }), sameTools: true },
	{ name: "cityofkeys-f10g10", direction: 10, minute: 6, call: () => ({ name: "postBoard", args: { text: "The city is watching who shares." } }), sameTools: false },
	{
		name: "whispers-f10-grudge",
		direction: 4,
		minute: 13,
		call: (golden) => {
			const call = golden.find((line) => line.type === "gamemaker_call");
			const args = call?.args;
			if (!isJsonObject(args)) throw new Error("no golden gamemaker call");
			return { name: String(call?.tool), args };
		},
		sameTools: false,
	},
];

/** The golden's `gamemaker_turn` inputs by round; the report hands back the round's input and keeps the looks. */
function goldenReport(golden: readonly LegacyLine[]): GamemakerReport & { readonly looks: GamemakerLook[] } {
	const inputs = new Map(golden.filter((line) => line.type === "gamemaker_turn").map((line) => [Number(line.round), String(line.input)]));
	const looks: GamemakerLook[] = [];
	return {
		looks,
		situation(look) {
			// The state is live: keep the look as it was.
			looks.push({ ...look, notes: [...look.notes], tracks: new Map(look.tracks) });
			const input = inputs.get(look.round);
			if (input === undefined) throw new Error(`no golden look after round ${String(look.round)}`);
			return input;
		},
	};
}

/** The golden's gamemaker steps by the host's minute (test/golden/scripts.ts `gamemakerSteps`). */
function steps(minutes: number, minute: () => number, plan: (minute: number) => ReturnType<typeof act> | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * minutes }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(minute());
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}

/** The old system prompt of the golden run's gamemaker (the old composer's, from the story and the direction). */
async function oldSystemPrompt(name: GoldenName, direction: number): Promise<string> {
	const { createFixture } = await import("../../helpers/fixture.ts");
	const story = storyOf(name);
	const fixture = createFixture({
		story,
		seed: 7,
		...(name.startsWith("cityofkeys") ? { agents: 6, minutes: 12, names: true, gmDirection: direction, figureDirection: direction } : { minutes: 20, figureDirection: 10 }),
		script: () => ({}),
		gamemakerScript: () => [],
	});
	const prompt = fixture.gamemaker?.systemPrompt;
	if (prompt === undefined) throw new Error("no gamemaker");
	return prompt;
}

const isGamemakerLine = (line: LegacyLine): boolean => String(line.type).startsWith("gamemaker_") || (line.type === "usage" && line.agent === GAMEMAKER_ID);
const outsideApp = (line: LegacyLine): boolean => legacyOwner(String(line.type)) !== "app";

function placed(line: LegacyLine, tokens: boolean): string {
	const counted = ["input", "output", "cacheRead", "cacheWrite"];
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at" && (tokens || line.type !== "usage" || !counted.includes(key)))));
}

async function replayWithOverseer(test: Case) {
	const { definition, golden, plan, story } = arenaStoryOf(test.name, "explicit");
	const spec = story.gamemaker;
	if (spec === undefined) throw new Error("no gamemaker");
	const report = goldenReport(golden);
	const system = await oldSystemPrompt(test.name, test.direction);
	const gamemaker = defineGamemaker(report).as("gamemaker", {
		every: spec.every,
		direction: directionLevel(test.direction),
		notesPerAgent: spec.notesPerAgent,
		boardPosts: spec.boardPosts,
		windowMinutes: spec.windowMinutes,
		system,
	});
	const withOverseer = defineCoreStory({ ...definition, overseers: [gamemaker] });
	const ref: { host?: Host } = {};
	const hostOf = (): Host => {
		if (ref.host === undefined) throw new Error("no host yet");
		return ref.host;
	};
	const call = test.call(golden);
	const binding = new ScriptedModelSource({ [GAMEMAKER_ID]: steps(plan.minutes, () => hostOf().minute, (minute) => (minute === test.minute ? act(call) : undefined)) }).bind(GAMEMAKER_ID, DEFAULT_LIMITS);
	const runtime = gamemakerRuntime({
		host: {
			record: (actor, type, payload) => {
				hostOf().record(actor, type, payload);
			},
			get minute() {
				return hostOf().minute;
			},
		},
		binding,
		thinking: spec.model.thinking ?? "low",
		modelCallsPerTurn: spec.modelCallsPerTurn,
	});
	const host = createHost({
		story: withOverseer,
		prompts: createPromptLookup({ story: fileURLToPath(new URL("../../mechanics/t2/prompts", import.meta.url)) }),
		overseers: runtime,
		app: { events: GAMEMAKER_APP_EVENTS },
	});
	ref.host = host;
	const lines: LegacyLine[] = [];
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	await host.run(async (turn) => {
		const window = plan.turns.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no golden turn for ${turn.resident} at minute ${String(turn.minute)}`);
		for (const line of window.lines) if (line.type === "tool_call" && replayed(String(line.tool))) await turn.call(String(line.tool), line.args);
	});
	return { golden, lines, looks: report.looks, system };
}

describe.each(CASES)("the gamemaker overseer on golden $name", (test) => {
	it("writes the golden's lines and the gamemaker's app lines in the golden's order", async () => {
		const run = await replayWithOverseer(test);
		const kept = (line: LegacyLine): boolean => outsideApp(line) || isGamemakerLine(line);
		const expected = run.golden.filter(kept).map((line) => placed(line, test.sameTools));
		expect(run.golden.filter(isGamemakerLine).length).toBeGreaterThan(30);
		const actual = run.lines.filter(kept).map((line) => placed(line, test.sameTools));
		if (test.name.startsWith("cityofkeys")) {
			expect(actual).toEqual(expected);
			return;
		}
		// Whispers: the holdout tribunal and the whisperer's core motive are not loaded here (golden-host.ts); the gamemaker's own lines hold.
		expect(run.lines.filter(isGamemakerLine).map((line) => placed(line, false))).toEqual(run.golden.filter(isGamemakerLine).map((line) => placed(line, false)));
	}, 120_000);

	it("hands the report the golden's notes and budget line", async () => {
		const run = await replayWithOverseer(test);
		const turns = run.golden.filter((line) => line.type === "gamemaker_turn");
		expect(run.looks.map((look) => look.round)).toEqual(turns.map((line) => Number(line.round)));
		for (const [index, look] of run.looks.entries()) {
			const input = String(turns[index]?.input);
			expect(input.endsWith(`Budget: ${look.budget}`)).toBe(true);
			const notes = look.notes.length === 0 ? "- none" : look.notes.slice(-12).map((note) => `- minute ${String(note.minute)} to ${note.to}: "${note.text}"`).join("\n");
			expect(input).toContain(`Your earlier notes (newest last):\n${notes}\n\nBudget:`);
		}
	}, 120_000);
});

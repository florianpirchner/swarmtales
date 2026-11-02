/**
 * The resident runner on the new host (step 18, item 1; apps/cli/src/host/residents.ts) against
 * the three goldens: the production story mapping (`hostStoryOf`), the host runner with a faux model
 * that answers each golden turn with the golden's own answer (its texts and tool calls, in order),
 * and the golden gamemaker's calls between the minutes.
 *
 * The gate: every golden line but the gamemaker's (its looks, texts, calls, results and `usage` of
 * `GM`, item 2 of "what remains") equals the host's line in order, the residents' app lines
 * included: `agent_profile`, `turn_input` (figure cues, the mechanics' inputs, the tools notice),
 * `request` (open tools in `TOOL_NAMES` order), `text`, `tool_call`, `tool_result` and `usage`
 * (the faux model counts the whole context: system prompt, every tool declaration, every message).
 * The residents' opening system prompts equal the golden `prompts.json`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fauxAssistantMessage, fauxText, fauxThinking, fauxToolCall, type AssistantMessage, type FauxContentBlock, type JsonObject, type JsonValue } from "@earendil-works/pi-ai";
import { legacySink } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { createHost } from "@swarmtales/kernel";
import { ScriptedModelSource } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { RESIDENT_APP_EVENTS } from "@swarmtales/roles";
import type { LegacyLine } from "@swarmtales/testkit";
import { hostResidents, type HostResidents } from "../../apps/cli/src/host/residents.ts";
import { hostStoryOf, type HostRun } from "../../apps/cli/src/host/story.ts";
import { GOLDEN_DIR } from "../helpers/golden.ts";
import { grudgeAddenda } from "../golden/host-scripts.ts";
import { goldenLog, RESIDENTS, SEED, storyOf, type GoldenName } from "../mechanics/puzzles/harness.ts";
import { planOf } from "../mechanics/t2/golden-plan.ts";

/** The golden runs' dials (test/golden/golden.test.ts; the fixture plays without names unless asked). */
const DIALS: Readonly<Record<GoldenName, Pick<HostRun, "figureDirection" | "gmDirection" | "names">>> = {
	"cityofkeys-f4g4": { figureDirection: 4, gmDirection: 4, names: true },
	"cityofkeys-f10g10": { figureDirection: 10, gmDirection: 10, names: true },
	"whispers-f10-grudge": { figureDirection: 10, gmDirection: 4, names: false },
};

const GAMEMAKER_TYPES = new Set(["gamemaker_turn", "gamemaker_thinking", "gamemaker_text", "gamemaker_call", "gamemaker_result", "gamemaker_error"]);

/** A golden line of the gamemaker (item 2 of "what remains"): not written by the resident runner. */
function ofGamemaker(line: LegacyLine): boolean {
	return GAMEMAKER_TYPES.has(String(line.type)) || (line.type === "usage" && line.agent === "GM");
}

/** Each resident's golden answers in turn order: the text, thinking and tool call blocks of the turn's model message. */
function answersOf(golden: readonly LegacyLine[]): Readonly<Record<string, AssistantMessage[]>> {
	const answers: Record<string, AssistantMessage[]> = {};
	let current: { agent: string; blocks: FauxContentBlock[] } | undefined;
	const flush = (): void => {
		if (current === undefined) return;
		(answers[current.agent] ??= []).push(fauxAssistantMessage(current.blocks));
		current = undefined;
	};
	for (const line of golden) {
		const agent = String(line.agent);
		if (line.type === "turn_input") {
			flush();
			current = { agent, blocks: [] };
		} else if (agent === current?.agent) {
			if (line.type === "text") current.blocks.push(fauxText(String(line.text)));
			if (line.type === "thinking") current.blocks.push(fauxThinking(String(line.text)));
			if (line.type === "tool_call") current.blocks.push(fauxToolCall(String(line.tool), toolArgs(line.args)));
			if (line.type === "usage") flush();
		}
	}
	flush();
	return answers;
}

/** A golden line's value as JSON (the line was parsed from JSON, so nothing is lost). */
function json(value: unknown): JsonValue {
	if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(json);
	if (typeof value === "object") return toolArgs(value);
	throw new Error(`not a JSON value: ${typeof value}`);
}

function toolArgs(value: unknown): JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, json(entry)])) : {};
}

function whispererOf(golden: readonly LegacyLine[]): string | undefined {
	const chosen = golden.find((line) => line.type === "whisperer_chosen");
	return chosen === undefined ? undefined : String(chosen.agent);
}

interface Replay {
	readonly golden: readonly LegacyLine[];
	readonly lines: readonly LegacyLine[];
	readonly prompts: Readonly<Record<string, string>>;
}

async function replay(name: GoldenName): Promise<Replay> {
	const story = storyOf(name);
	const golden = goldenLog(name);
	const plan = planOf(golden);
	const run: HostRun = {
		residents: [...RESIDENTS],
		seed: SEED,
		minutes: plan.minutes,
		arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false },
		coreMotives: true,
		whisperer: true,
		guards: true,
		gamemaker: true,
		...DIALS[name],
	};
	const { definition } = hostStoryOf(story, run);
	const ref: { host?: Host; residents?: HostResidents } = {};
	const between = async (minute: number): Promise<void> => {
		for (const line of plan.between.get(minute) ?? []) {
			if (line.type !== "gamemaker_call" || ref.host === undefined) continue;
			const outcome = await ref.host.call("gamemaker", String(line.tool), line.args);
			if (!outcome.ok) throw new Error(`gamemaker ${String(line.tool)} at minute ${String(minute)}: ${outcome.code}`);
		}
	};
	const host = createHost({
		story: definition,
		prompts: createPromptLookup({ story: fileURLToPath(new URL("../mechanics/t2/prompts", import.meta.url)) }),
		between,
		app: { events: RESIDENT_APP_EVENTS },
		awaitsAnswer: (resident) => ref.residents?.awaitsAnswer(resident) ?? false,
	});
	ref.host = host;
	const lines: LegacyLine[] = [];
	host.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	host.start();
	const whisperer = whispererOf(golden);
	const residents = hostResidents({
		story,
		run,
		host,
		models: new ScriptedModelSource(answersOf(golden)),
		...(name === "whispers-f10-grudge" && whisperer !== undefined ? { promptAddenda: grudgeAddenda(whisperer, RESIDENTS) } : {}),
	});
	ref.residents = residents;
	residents.recordProfiles();
	await host.run(residents.take);
	return { golden, lines, prompts: Object.fromEntries(residents.prompts) };
}

/** A line without its log position (the gamemaker's lines are left out, so the seqs shift). */
function placed(line: LegacyLine): string {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq")));
}

function goldenPrompts(name: GoldenName): unknown {
	return JSON.parse(readFileSync(`${GOLDEN_DIR}/${name}.prompts.json`, "utf8"));
}

describe.each(["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"] as const)("the host resident runner on golden %s", (name) => {
	it("writes every golden line but the gamemaker's, the residents' app lines included, in order", async () => {
		const run = await replay(name);
		const expected = run.golden.filter((line) => !ofGamemaker(line)).map(placed);
		expect(expected.filter((line) => line.includes('"type":"turn_input"')).length).toBeGreaterThan(50);
		expect(run.lines.map(placed)).toEqual(expected);
	}, 120_000);

	it("builds the residents' opening system prompts of the golden prompts.json", async () => {
		const run = await replay(name);
		expect(run.prompts).toEqual(goldenPrompts(name));
	}, 120_000);
});

/**
 * Whole runs old against new beyond the goldens (step 18, team R1): the old composer (`composeRun`,
 * `Arena` + `AgentRunner` on `World`) and the host runner (`hostResidents` on `hostStoryOf`) play the
 * same story with the same scripted answers per resident and step (answers that do not read the
 * world: texts, `getStatus`, `activeTools`, `readBoard`, `listAgents`, a wrong code), on dials the
 * goldens do not use: blocks of two and three (every member's `turn_input` and `request` before
 * the block acts), two passes a minute, figure direction 6 and 8 (the cues), no personas. Every
 * line of both logs is compared in order, the app lines included.
 */
import { describe, expect, it } from "vitest";
import { fauxAssistantMessage, fauxText, fauxToolCall, type FauxResponseStep } from "@earendil-works/pi-ai";
import { legacySink, MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { ScriptedModelSource } from "@swarmtales/models";
import type { LegacyLine } from "@swarmtales/testkit";
import { composeRun } from "../../apps/cli/src/compose.ts";
import { effectiveRun, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import { competitorIds } from "@swarmtales/kernel";
import { Type } from "typebox";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { hostResidents, type HostResidents } from "../../apps/cli/src/host/residents.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { hostRunOf, startedHost, withRivals } from "./support/host-residents.ts";

/** Answers for up to twelve residents (a case plays six unless it says otherwise). */
const IDS = Array.from({ length: 12 }, (_, at) => `A${String(at + 1).padStart(2, "0")}`);

/** The k-th answer of a resident: a pure function of its seat and k. */
function answer(seat: number, step: number): FauxResponseStep {
	switch ((seat + step) % 5) {
		case 0:
			return fauxAssistantMessage([fauxText(`${IDS[seat] ?? "A00"} looks around.`), fauxToolCall("getStatus", {})]);
		case 1:
			return fauxAssistantMessage(fauxText("I wait for the next clue."));
		case 2:
			return fauxAssistantMessage([fauxToolCall("activeTools", {}), fauxToolCall("readBoard", {})]);
		case 3:
			return fauxAssistantMessage([fauxToolCall("listAgents", {}), fauxToolCall("submitSolution", { level: 1, code: "WRONG1" })]);
		default:
			return fauxAssistantMessage(fauxText("Noted."));
	}
}

function script(): Record<string, FauxResponseStep[]> {
	return Object.fromEntries(IDS.map((id, seat) => [id, Array.from({ length: 80 }, (_, step) => answer(seat, step))]));
}

/** The script without what the faux helpers draw fresh each time (tool call ids, timestamps): the script's part of a fingerprint. */
function stableScript(): unknown {
	return JSON.parse(JSON.stringify(script(), (key, value: unknown) => (key === "id" || key === "timestamp" ? undefined : value)));
}

interface Case {
	readonly name: string;
	readonly story: AnyStory;
	readonly overrides: RunOverrides;
}

const CASES: readonly Case[] = [
	{ name: "cityofkeys, blocks of two, figure 8", story: cityOfKeys, overrides: { blockSize: 2, figureDirection: 8 } },
	{ name: "cityofkeys, blocks of three, two passes, figure 6", story: cityOfKeys, overrides: { blockSize: 3, passesPerMinute: 2, figureDirection: 6 } },
	{ name: "cityofkeys, one block of six, gm 10, without personas", story: cityOfKeys, overrides: { blockSize: 6, figureDirection: 10, gmDirection: 10, personas: false } },
	{ name: "whispers, blocks of two, figure 10", story: whispers, overrides: { blockSize: 2, figureDirection: 10 } },
	{ name: "cityofkeys, activation on novelty (a resident with unanswered results steps)", story: cityOfKeys, overrides: { activation: "onNovelty", blockSize: 2, figureDirection: 8 } },
	{ name: "whispers, activation on novelty", story: whispers, overrides: { activation: "onNovelty", figureDirection: 10 } },
	// Rival lines name residents; after the names are chosen the full figure comes again at minute 10, shown with names.
	{ name: "cityofkeys with rivals, 12 residents, 12 minutes, figure 10, gm 10", story: withRivals(cityOfKeys), overrides: { agents: 12, minutes: 12, blockSize: 2, figureDirection: 10, gmDirection: 10 } },
];

const BASE: RunOverrides = { agents: 6, minutes: 6, seed: 7, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false };

/** The old composer's log, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
async function playOld(entry: Case): Promise<readonly LegacyLine[]> {
	return oldRunAsync({ story: entry.story, overrides: { ...BASE, ...entry.overrides }, script: stableScript() }, Type.Array(Type.Record(Type.String(), Type.Unknown())), () => playOldLive(entry));
}

/** The live old composer (recording only; deleted with the engine). */
async function playOldLive(entry: Case): Promise<readonly LegacyLine[]> {
	const sink = new MemorySink();
	const composed = composeRun({ story: entry.story, overrides: { ...BASE, ...entry.overrides }, models: new ScriptedModelSource(script()), sinks: [sink] });
	await composed.arena.run();
	return sink.events.map((event) => Object.fromEntries(Object.entries(event)));
}

async function playNew(entry: Case): Promise<readonly LegacyLine[]> {
	const effective = effectiveRun(entry.story, { ...BASE, ...entry.overrides });
	const run = hostRunOf(effective, competitorIds(effective.agents));
	const ref: { residents?: HostResidents; host?: Host } = {};
	const lines: LegacyLine[] = [];
	const host = startedHost(entry.story, run, (resident) => ref.residents?.awaitsAnswer(resident) ?? false, (subscribed) => {
		subscribed.subscribe(legacySink((event) => lines.push(Object.fromEntries(Object.entries(event)))));
	});
	const residents = hostResidents({ story: entry.story, run, host, models: new ScriptedModelSource(script()), personas: effective.personas });
	ref.residents = residents;
	residents.recordProfiles();
	await host.run(residents.take);
	return lines;
}

describe.each(CASES.map((entry) => [entry.name, entry] as const))("old against new, %s", (_name, entry) => {
	it("writes the same log, app lines included", async () => {
		const old = await playOld(entry);
		const fresh = await playNew(entry);
		expect(old.filter((line) => line.type === "turn_input").length).toBeGreaterThan(20);
		expect(fresh).toEqual(old);
	}, 120_000);
});

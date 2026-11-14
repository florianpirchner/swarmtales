/**
 * Oracles of the stories the old app composes from one story definition (City of Keys, Whispers): a run through the
 * app's own path (`composeHostRun`) with scripted models for the residents and the gamemaker. The timeline is read
 * from the host's log; the residents' answers come from the lines their runners logged.
 */
import type { AnyStory, EventEnvelope, RunEnd } from "@swarmtales/contracts";
import { createHostFixture, type HostFixture, type HostFixtureOptions } from "../../test/helpers/host-fixture.ts";
import { snapshotTaker } from "../../test/helpers/host-snapshot.ts";
import { resumedOverrides } from "../../apps/cli/src/run-options.ts";
import { MemorySink } from "@swarmtales/chronicle";
import { readResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { ACT_ONE_SNAPSHOT, actTwoGamemaker, actTwoResidents, halfCity, JUDGE_SCRIPT, SNAPSHOT } from "./city-act2.ts";
import type { Oracle, OracleEntry, OracleSetup } from "./format.ts";
import { assemble, OutcomeBook, plainJson, timelineOf } from "./record.ts";

export interface ComposedOptions {
	readonly game: string;
	readonly variant: string;
	readonly story: AnyStory;
	/** The file of the story definition next to the oracle (`definitionText`). */
	readonly definition: string;
	/** The script's name and what it does. */
	readonly script: string;
	readonly note: string;
	readonly fixture: Omit<HostFixtureOptions, "story" | "resume" | "snapshot">;
	/** Save the run after this minute and continue it on a fresh host. */
	readonly resumeAfter?: number;
}

/** The story definition as the file next to the oracles holds it. */
export function definitionText(story: AnyStory): string {
	return `${JSON.stringify(plainJson(story), null, "\t")}\n`;
}

function setupOf(options: Pick<ComposedOptions, "story" | "definition">, run: HostFixture, events: readonly EventEnvelope[]): OracleSetup {
	const { effective, host } = run;
	// `run_started` lists the mechanics in load order; their options are derived from the definition.
	return {
		story: options.story.id,
		seed: effective.seed,
		minutes: effective.minutes,
		residents: [...host.residents],
		mechanics: host.mechanics.map((id) => ({ id, options: null })),
		residentTools: host.toolSpecs("resident").map((spec) => spec.name),
		locked: [...new Set(events.filter((event) => event.source === "core" && event.type === "tool_locked" && event.minute === 0 && event.actor === "host").map((event) => String(Reflect.get(Object(event.payload), "tool"))))],
		turns: { passes: effective.passesPerMinute, blockSize: effective.blockSize, activation: effective.activation === "onNovelty" ? "onNews" : "always", order: "custom" },
		definition: { file: options.definition, effective: plainJson(effective) ?? null },
	};
}

function timelineFor(events: readonly EventEnvelope[]): OracleEntry[] {
	return timelineOf(events, OutcomeBook.fromAppEvents(events));
}

/** Plays the story to its end, with a save and a resume in between when asked, and returns the oracle. */
export async function composedOracle(options: ComposedOptions): Promise<Oracle> {
	const source = { kind: "scripted" as const, from: `scripts/oracles/city-scripts.ts#${options.script}`, note: options.note };
	const identity = { game: options.game, variant: options.variant, source };
	if (options.resumeAfter === undefined) {
		const run = createHostFixture({ ...options.fixture, story: options.story });
		const end = await run.run();
		const events = run.host.log.all();
		return assemble({ ...identity, seed: run.effective.seed, setup: setupOf(options, run, events), timeline: timelineFor(events), end });
	}
	const taker = snapshotTaker({ afterLevel: 1, atMinute: options.resumeAfter, stop: true });
	const first = createHostFixture({ ...options.fixture, story: options.story, snapshot: taker.request });
	await first.run();
	const taken = taker.taken();
	if (taken === undefined) throw new Error(`${options.variant}: no snapshot was taken after minute ${String(options.resumeAfter)}`);
	const before = taken.point.events.length;
	const second = createHostFixture({ ...options.fixture, ...resumedOverrides(taken.point, options.fixture), story: options.story, resume: { point: taken.point, name: "saved" } });
	const end: RunEnd = await second.run();
	const events = second.host.log.all();
	const timeline: OracleEntry[] = [...timelineFor(events.slice(0, before)), { k: "resume", minute: second.host.log.all()[before]?.minute ?? options.resumeAfter }, ...timelineFor(events.slice(before))];
	return assemble({ ...identity, seed: second.effective.seed, setup: setupOf(options, second, events), timeline, end });
}

/**
 * The second act of City of Keys, continued from the published Act I checkpoint (`city-act2.ts`). The timeline starts
 * at the resume: what the checkpoint holds (the first act of a recorded live run) is the starting state, not part of the file.
 */
export async function actTwoOracle(options: { readonly game: string; readonly variant: string; readonly definition: string; readonly note: string }): Promise<Oracle> {
	const point = readResumePoint(SNAPSHOT);
	const lines = new MemorySink();
	const story = halfCity();
	const run = createHostFixture({
		story,
		...resumedOverrides(point, { minutes: 60, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, names: true }),
		script: (host) => actTwoResidents({ host, lines }),
		gamemakerScript: (host) => actTwoGamemaker({ host, lines }),
		judgeScript: JUDGE_SCRIPT,
		sinks: [lines],
		resume: { point, name: "snapshot-L7.json" },
	});
	const end = await run.run();
	const events = run.host.log.all();
	const own = events.slice(point.events.length);
	const timeline: OracleEntry[] = [{ k: "resume", minute: own[0]?.minute ?? point.minute }, ...timelineFor(own)];
	return assemble({
		game: options.game,
		variant: options.variant,
		seed: run.effective.seed,
		source: { kind: "scripted", from: "scripts/oracles/city-act2.ts#actTwoResidents", note: `${options.note}; starting state: ${ACT_ONE_SNAPSHOT}` },
		setup: setupOf({ story, definition: options.definition }, run, own),
		timeline,
		end,
	});
}

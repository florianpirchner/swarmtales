/**
 * The generic runner for a story that is a `CoreStory` (docs/ideas/tictactoe-teams.md §4, prerequisite 1):
 * any list of mechanics, no city mapping. `composeHostRun` (run.ts) maps an old `AnyStory` onto a fixed
 * mechanic set; this one loads the story as it is. The residents get the neutral base prompt
 * (`world: "neutral"`) and the story's own briefing, one {@link HostResidentRunner} each, and the
 * mechanics' turn inputs, tools and context resets (`CONTEXT_RESET_KIND`) work as for any resident.
 *
 * No overseers, no weaver, no snapshot or resume yet: a core story that needs them is a later step.
 */
import { LegacyEventAdapter, toRecorded, type LegacyEvent } from "@swarmtales/chronicle";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { CoreStory, Host, ModelChoice, ResidentId, RunEnd, ThinkingLevel, ToolSpec, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import type { EventSink, RecordedEvent } from "@swarmtales/legacy-log";
import type { ModelSource, RequestLimits } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import { HostResidentRunner, inCatalogOrder, neutralSystemPrompt, RESIDENT_APP_EVENTS } from "@swarmtales/roles";
import type { CoreStoryEntry } from "../../../../stories/index.ts";
import { RESIDENT_LIMITS } from "./residents.ts";

const RunEnded = Type.Object({ reason: Type.String() }, { additionalProperties: true });

/** The signed log needs a legacy `run_end` as its last line; a core story has no arena mechanic to write one, so the core's `run_ended` becomes it. */
const LEGACY_RUN_END = { "core.run_ended": (event: { readonly payload: unknown }) => [{ type: "run_end", ...(Check(RunEnded, event.payload) ? { reason: event.payload.reason } : {}) }] };

/** A mechanic's event the legacy union does not know: it is written as it is, payload fields after `type`, with its `seq` and `minute`. */
function isPassThrough(line: LegacyEvent): line is LegacyEvent & RecordedEvent {
	return typeof line.type === "string";
}

function isKnownEvent(line: LegacyEvent): boolean {
	try {
		toRecorded(line);
		return true;
	} catch {
		return false;
	}
}

/** The legacy mapping for events the old union knows; every other event of a core story passes through unchanged. */
export function recordedCoreEvent(line: LegacyEvent): RecordedEvent {
	try {
		return toRecorded(line);
	} catch (error) {
		if (isPassThrough(line)) return line;
		throw error;
	}
}

/** What the command line may change of a core story's run. */
export interface CoreRunOverrides {
	readonly agents?: number;
	readonly minutes?: number;
	readonly seed?: number;
}

export interface CoreComposeOptions {
	readonly entry: CoreStoryEntry;
	readonly overrides?: CoreRunOverrides;
	/** A model source, or a factory for one that needs the started host. */
	readonly models: ModelSource | ((host: Host) => ModelSource);
	/** Replaces the entry's model in the profiles that `agent_profile` logs (the source itself is `models`). */
	readonly modelOverride?: ModelChoice;
	readonly sinks: readonly EventSink[];
	readonly limits?: RequestLimits;
	readonly thinking?: ThinkingLevel;
}

export interface CoreComposedRun {
	readonly story: CoreStory;
	readonly host: Host;
	/** The system prompt of each resident, in roster order. */
	readonly prompts: ReadonlyMap<ResidentId, string>;
	readonly runner: (resident: ResidentId) => HostResidentRunner | undefined;
	/** Plays the run to its end. */
	run(): Promise<RunEnd>;
}

/** The story with the run's seed, length and roster applied; the story itself is never changed. */
export function coreStoryFor(story: CoreStory, overrides: CoreRunOverrides = {}): CoreStory {
	return { ...story, seed: overrides.seed ?? story.seed, minutes: overrides.minutes ?? story.minutes, residents: overrides.agents ?? story.residents };
}

export function composeCoreRun(options: CoreComposeOptions): CoreComposedRun {
	const { entry } = options;
	const story = coreStoryFor(entry.story, options.overrides);
	const runners = new Map<ResidentId, HostResidentRunner>();
	const host = createHost({
		story,
		prompts: createPromptLookup(entry.prompts === undefined ? {} : { story: entry.prompts }),
		app: { events: RESIDENT_APP_EVENTS },
		awaitsAnswer: (resident) => runners.get(resident)?.awaitsAnswer ?? false,
	});

	const adapter = new LegacyEventAdapter({ translators: LEGACY_RUN_END });
	host.subscribe((envelope) => {
		for (const line of adapter.write(envelope)) {
			const event = recordedCoreEvent(line);
			const known = isKnownEvent(line);
			for (const sink of options.sinks) {
				try {
					sink.record(event);
				} catch (error) {
					// A sink that reads typed events (the transcripts) does not know a mechanic's own event; the signed log does.
					if (known) throw error;
				}
			}
		}
	});
	host.start();

	const source = typeof options.models === "function" ? options.models(host) : options.models;
	const model = options.modelOverride ?? entry.model;
	const passes = story.turns?.passes ?? 1;
	const specs = host.toolSpecs("resident");
	const all: readonly ToolSpec[] = inCatalogOrder(specs.map((spec) => spec.name)).flatMap((name) => specs.filter((spec) => spec.name === name));
	const prompts = new Map<ResidentId, string>();
	const limits = options.limits ?? { ...RESIDENT_LIMITS, ...(model.maxOutputTokens === undefined ? {} : { maxOutputTokens: model.maxOutputTokens }) };
	for (const id of host.residents) {
		const systemPrompt = neutralSystemPrompt({ id, passesPerMinute: passes, briefing: entry.briefing(id, host) });
		prompts.set(id, systemPrompt);
		const actor = residentActor(id);
		runners.set(
			id,
			new HostResidentRunner({
				id,
				systemPrompt,
				tools: all,
				binding: source.bind(id, limits),
				thinking: options.thinking ?? model.thinking ?? "medium",
				record: (type, payload) => {
					host.record(actor, type, payload);
				},
				openTools: () => host.openTools(id),
				recordCost: (usd) => {
					host.recordCost(usd);
				},
			}),
		);
		host.record(actor, "agent_profile", { agent: id, provider: model.provider, model: model.id ?? "-" });
	}

	const take: TurnTaker = (turn) => {
		const runner = runners.get(turn.resident);
		if (runner === undefined) return Promise.reject(new Error(`no runner for resident ${turn.resident}`));
		return runner.step(turn, []);
	};
	return {
		story,
		host,
		prompts,
		runner: (resident) => runners.get(resident),
		async run() {
			for (;;) {
				const end = await host.playMinute(take);
				if (end !== undefined) return end;
				// A scripted minute settles in microtasks only; one macrotask turn per minute lets timers and signals through.
				await new Promise((resolve) => setImmediate(resolve));
			}
		},
	};
}

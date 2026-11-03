/**
 * Wires a story into a playable run on the new host (step 18, item 5; replaces `composeRun` of
 * compose.ts and the old `World`, `Director`, `Arena`, roles): the production story mapping
 * (`hostStoryOf`), the overseers (classifier, weaver, gamemaker, judge) with one runtime router by
 * definition id (C2-11), the residents' runners (`hostResidents`), the legacy event log for the
 * old sinks, the run snapshot and the resume. Used by the CLI and by the tests.
 *
 * Two facts are only known once the run has started (who whispers, the dealt core motives), but the
 * overseers' options need them: the weaver reads each resident's character, the gamemaker's system
 * prompt says whether the report shows characters and a whisperer. So the story is first started
 * (or resumed) on a **probe host** without overseers, which only deals; its facts fill the options;
 * then the run's host starts with the overseers. Overseers draw no mechanic's randomness, so both
 * hosts deal the same (the golden runs prove it, test/golden/golden.test.ts).
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import { CoreMotiveDriveSchema, CoreMotiveTraitSchema, LegacyEventAdapter, SnapshotError, toRecorded, type CastEntry } from "@swarmtales/chronicle";
import type { EventSink, RecordedEvent } from "@swarmtales/legacy-log";
import { directionLevel, type AnyStory, type EventEnvelope, type GuardJudge, type GuardModel, type Host, type HostSnapshot, type ModelChoice, type OverseerRuntime, type OverseerUse, type ResidentId, type RunEnd, type Souffleur, type ThinkingLevel, type TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import type { ModelSource, RequestLimits } from "@swarmtales/models";
import { createPromptLookup } from "@swarmtales/prompts";
import {
	assignModels,
	defineGamemaker,
	GAMEMAKER_APP_EVENTS,
	GAMEMAKER_ID,
	gamemakerOptions,
	gamemakerRuntime,
	GUARD_ID,
	overseerRouter,
	overseers,
	RESIDENT_APP_EVENTS,
	type InnerVoice,
	type OverseerBackend,
} from "@swarmtales/roles";
import { storyId } from "../../../../stories/index.ts";
import { assertPlayable, DEFAULT_LIMITS, effectiveRun, type EffectiveRun, type RunOverrides } from "../run-options.ts";
import { hostGamemakerReport } from "./report.ts";
import { hostResidents, type HostResidents, type ResidentProfile } from "./residents.ts";
import { RUN_FILE_FORMAT, RUN_FILE_VERSION, type ResumePoint, type RunFileOut } from "./snapshot.ts";
import { hostStoryOf, type HostRun } from "./story.ts";
import { WeaverDesk } from "./weaver-desk.ts";

/** The overseers' names in the story (each is used under its definition's id). */
const NAMES = { classifier: "classifier", weaver: "weaver", gamemaker: "gamemaker", judge: "judge" } as const;

/** The app's `run_resumed` line (the composer wrote it before the old world was restored). */
const RUN_RESUMED = { run_resumed: Type.Object({ snapshot: Type.String(), level: Type.Integer(), round: Type.Integer(), minutes: Type.Integer(), meta: Type.Optional(Type.Record(Type.String(), Type.String())) }) };

export interface HostSnapshotRequest {
	readonly afterLevel: number;
	/** Take it at the first minute's end at or after this minute instead; its level is the highest every resident has passed. */
	readonly atMinute?: number;
	/** End the run right after the snapshot. */
	readonly stop: boolean;
	/** Where the snapshot goes, for the run's end reason. */
	readonly file: string;
	/** Stores the snapshot; returns where it went. */
	readonly write: (snapshot: RunFileOut) => string;
}

export interface HostResume {
	readonly point: ResumePoint;
	/** File name of the snapshot, logged in `run_resumed`. */
	readonly name: string;
}

export interface HostComposeOptions {
	readonly story: AnyStory;
	readonly overrides?: RunOverrides;
	/** A model source, or a factory for sources that need the host (the scripted oracle) or the assignments. */
	readonly models: ModelSource | ((host: Host, assignments: ReadonlyMap<ResidentId, ModelChoice>) => ModelSource);
	/** Replaces every per-resident model (CLI `--model`). */
	readonly modelOverride?: ModelChoice;
	readonly sinks: readonly EventSink[];
	readonly limits?: RequestLimits;
	readonly thinking?: ThinkingLevel;
	/** Whether the app counts its spend: then the run's budget (`--budget`, `run.budgetUsd`) ends it. */
	readonly budget?: boolean;
	readonly meta?: Readonly<Record<string, string>>;
	/** The gamemaker's model; required when the run plays with one. */
	readonly gamemakerModels?: ModelSource | ((host: Host) => ModelSource);
	/** The classifier's model; required when the run labels statements. */
	readonly classifier?: OverseerBackend & { readonly maxChars?: number };
	/** The city's judge for `blame`; without one the tool answers that the judge is absent. */
	readonly judge?: OverseerBackend;
	/** The judge's temper (`--judge-temper`). */
	readonly judgeTemper?: overseers.JudgeTemperName;
	/** The tool guard's model (SPEC 20); without one a story's guards run only the city's own check. */
	readonly guardJudge?: GuardJudge;
	/** Rewrites a resident's step the provider's safeguards refused (P44). */
	readonly souffleur?: Souffleur;
	/** The weaver's model; required when the run plays with the weaver. */
	readonly weaver?: OverseerBackend;
	readonly snapshot?: HostSnapshotRequest;
	readonly resume?: HostResume;
	/** Texts appended to the system prompt (prompt experiments, `lab/`): of every resident, or of `agent` alone. */
	readonly promptAddenda?: readonly { readonly agent?: ResidentId; readonly text: string }[];
}

export interface HostComposedRun {
	readonly story: AnyStory;
	readonly effective: EffectiveRun;
	readonly host: Host;
	readonly residents: HostResidents;
	readonly profiles: readonly ResidentProfile[];
	/** The gamemaker's system prompt, when one plays. */
	readonly gamemakerPrompt?: string;
	/** Plays the run to its end. */
	run(): Promise<RunEnd>;
}

/** The figures a run names (`--cast`): the story has a cast with each of them, and there are no more than residents. */
function assertCast(story: AnyStory, effective: EffectiveRun, cast: readonly string[] | undefined): void {
	if (cast === undefined) return;
	const figures = story.coreMotives?.figures ?? [];
	if (!effective.coreMotives || figures.length === 0) throw new SnapshotError(`The story ${story.id} has no cast to play`);
	const unknown = cast.filter((id) => !figures.some((figure) => figure.id === id));
	if (unknown.length > 0) throw new SnapshotError(`Unknown figures ${unknown.join(", ")}; the cast has ${figures.map((figure) => figure.id).join(", ")}`);
	if (cast.length > effective.agents) throw new SnapshotError(`The cast names ${String(cast.length)} figures for ${String(effective.agents)} residents`);
}

/** A snapshot fits this run when story, seed, residents and first level match and minutes are left to play. */
function assertResumable(point: ResumePoint, story: AnyStory, effective: EffectiveRun): void {
	const mismatches = [
		storyId(point.story) === story.id ? undefined : `story "${point.story}" (this run: "${story.id}")`,
		point.seed === effective.seed ? undefined : `seed ${String(point.seed)} (this run: ${String(effective.seed)})`,
		point.agents === effective.agents ? undefined : `${String(point.agents)} agents (this run: ${String(effective.agents)})`,
		point.run.startLevel === effective.startLevel ? undefined : `first level ${String(point.run.startLevel)} (this run: ${String(effective.startLevel)})`,
	].filter((entry): entry is string => entry !== undefined);
	if (mismatches.length > 0) throw new SnapshotError(`The snapshot does not fit this run: it was taken with ${mismatches.join(", ")}`);
	if (effective.minutes <= point.round) {
		throw new SnapshotError(`The snapshot was taken after minute ${String(point.minute)}; --minutes must be greater than ${String(point.round)} to play on`);
	}
}

/** The arena's snapshot cut (`arena.snapshot`), as the app reads it. */
const Cut = Type.Object({
	round: Type.Integer(),
	minute: Type.Integer(),
	label: Type.String(),
	stop: Type.Boolean(),
	brake: Type.Optional(Type.Object({ act: Type.String(), minute: Type.Integer(), maxMinutes: Type.Integer(), behind: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer() })) }, { additionalProperties: true })),
});

const Section = Type.Object(
	{
		alive: Type.Array(Type.String()),
		ranking: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), finished: Type.Boolean(), waiting: Type.Union([Type.Integer(), Type.Null()]) }, { additionalProperties: true })),
	},
	{ additionalProperties: true },
);

/** The highest level every resident still in the city has passed (0 for none), from progression's section. */
function passedByAll(host: Host, lastLevel: number): number {
	const section = host.facts()["progression.section"];
	if (!Check(Section, section)) return 0;
	const passed = (agent: string, level: number): boolean => {
		const entry = section.ranking.find((row) => row.agent === agent);
		return entry !== undefined && (entry.finished || entry.level > level || (entry.waiting ?? 0) >= level);
	};
	let level = lastLevel;
	while (level > 0 && !section.alive.every((agent) => passed(agent, level))) level -= 1;
	return level;
}

/** The run's dials as the host mapping reads them. */
function hostRunOf(story: AnyStory, effective: EffectiveRun, options: HostComposeOptions, names: boolean): HostRun {
	const budgetUsd = options.overrides?.budgetUsd ?? story.run.budgetUsd;
	const request = options.snapshot;
	return {
		residents: Array.from({ length: effective.agents }, (_unused, index) => `A${String(index + 1).padStart(2, "0")}`),
		seed: effective.seed,
		minutes: effective.minutes,
		arena: {
			startLevel: effective.startLevel,
			activation: effective.activation,
			passesPerMinute: effective.passesPerMinute,
			blockSize: effective.blockSize,
			stopWhenDone: effective.stopWhenDone,
			stopWhenSeatsDecided: effective.stopWhenSeatsDecided,
			...(budgetUsd === undefined || options.budget !== true ? {} : { budgetUsd }),
			...(options.meta === undefined ? {} : { meta: options.meta }),
			// A snapshot at a minute names no level; one beyond the last never matches an act brake's last level (old `afterLevel: 0`).
			...(request === undefined
				? {}
				: { snapshot: { afterLevel: request.atMinute === undefined ? request.afterLevel : effective.lastLevel + 1, ...(request.atMinute === undefined ? {} : { atMinute: request.atMinute }), stop: request.stop, file: request.file } }),
		},
		lastLevel: effective.lastLevel,
		...(request === undefined || request.atMinute !== undefined ? {} : { holdAfter: request.afterLevel }),
		names,
		coreMotives: effective.coreMotives,
		...(options.overrides?.cast === undefined ? {} : { cast: options.overrides.cast }),
		whisperer: effective.whisperer,
		guards: effective.guards,
		gamemaker: effective.gamemaker,
		figureDirection: effective.figureDirection,
		gmDirection: effective.gmDirection,
	};
}

/** The tool guard's model as the host asks it, with its spend logged as `usage` of `GD` (the old metered guard). */
function hostGuard(judge: GuardJudge, host: () => Host): GuardModel {
	return {
		label: judge.label,
		async judge(question) {
			const answer = await judge.judge({ agent: question.resident, tool: question.tool, rule: question.rule, text: question.text, secrets: question.secrets });
			for (const entry of answer.usage) host().record("host", "usage", { agent: GUARD_ID, ...entry });
			return answer;
		},
	};
}

/** What the probe host tells about the run once it has dealt: the residents' characters and the gamemaker's report flags. */
interface StartFacts {
	readonly characters: Readonly<Record<string, string>>;
	readonly whisperer: boolean;
	readonly coreMotives: boolean;
}

const Whisperer = Type.Union([Type.String(), Type.Null()]);
const CoreMotives = Type.Record(Type.String(), Type.Unknown());

function startFacts(probe: Host, story: AnyStory, run: HostRun, options: HostComposeOptions, personas: boolean): StartFacts {
	const residents = hostResidents({ story, run, host: probe, personas, ...(options.promptAddenda === undefined ? {} : { promptAddenda: options.promptAddenda }), ...(options.modelOverride === undefined ? {} : { modelOverride: options.modelOverride }) });
	const facts = probe.facts();
	const whisperer = facts["whispers.whisperer"];
	const motives = facts["motives.coreMotives"];
	return {
		characters: Object.fromEntries(residents.characters),
		whisperer: Check(Whisperer, whisperer) && whisperer !== null,
		coreMotives: Check(CoreMotives, motives) && Object.keys(motives).length > 0,
	};
}

/** The gamemaker's system prompt from the story, the dials and the probe's facts (old `createGamemaker`). */
function gamemakerUse(story: AnyStory, effective: EffectiveRun, facts: StartFacts, labels: boolean, mechanics: readonly string[]): OverseerUse {
	const spec = story.gamemaker;
	if (spec === undefined) throw new Error(`Story ${story.id} has no gamemaker`);
	const direction = directionLevel(effective.gmDirection);
	const options = gamemakerOptions({
		city: story.city,
		agents: effective.agents,
		survivors: story.run.survivors,
		rules: story.rules,
		spec,
		labels,
		...(story.tribunal === undefined || !spec.roles.some((entry) => entry.role === "director") ? {} : { tribunal: { factions: story.tribunal.factions !== undefined } }),
		characters: story.goals !== undefined || facts.coreMotives,
		seal: mechanics.includes("seal"),
		direction,
		...(story.holdout === undefined ? {} : { holdout: story.holdout }),
		...(facts.whisperer ? { whisperer: true } : {}),
		// The whisperer's measured orders (old `whisperQuota`): a whisperer, figure direction 10 and a story quota.
		...(facts.whisperer && effective.figureDirection >= 10 && story.whisperer?.direction?.quota !== undefined ? { whispererDuty: true } : {}),
	});
	return defineGamemaker(hostGamemakerReport(story)).as(NAMES.gamemaker, options);
}

/** A host that only deals: the story without overseers, started, or resumed with its resume work done. */
function probeHost(definition: ReturnType<typeof hostStoryOf>["definition"], resume: { readonly snapshot: HostSnapshot; readonly events: readonly EventEnvelope[] } | undefined): Host {
	const probe = createHost({ story: definition, prompts: createPromptLookup(), app: { events: RESIDENT_APP_EVENTS }, ...(resume === undefined ? {} : { resume }) });
	// A resumed probe runs its resume work now: a snapshot from before the core motives deals them there (v09).
	probe.start();
	return probe;
}

/**
 * The snapshot with the slices of this run's overseers only: a run resumed without the weaver (or
 * the gamemaker, the classifier) plays on without it, as the old engine did; the app keeps what the
 * weaver changed (the run file's desk).
 */
function onlyDeclared(snapshot: HostSnapshot, uses: readonly OverseerUse[]): HostSnapshot {
	const saved = snapshot.overseers;
	if (saved === undefined) return snapshot;
	const names = new Set(uses.map((use) => use.name));
	return { ...snapshot, overseers: Object.fromEntries(Object.entries(saved).filter(([name]) => names.has(name))) };
}

/** The snapshot without the overseers' slices, for the probe host that loads none. */
function withoutOverseers(snapshot: HostSnapshot): HostSnapshot {
	const copy = { ...snapshot };
	delete copy.overseers;
	return copy;
}

/** Whether the snapshot's run named its residents (the old `restoredNames`). */
function namesOfSnapshot(point: ResumePoint): boolean {
	const data = point.host.mechanics.names?.data;
	if (data === undefined || typeof data !== "object" || data === null) return false;
	if (Reflect.get(data, "off") === true) return false;
	// The converter's version-0 slice holds the old world field `names` (absent when the run had none).
	return point.host.mechanics.names?.version !== 0 || Reflect.get(data, "names") !== undefined;
}

export function composeHostRun(options: HostComposeOptions): HostComposedRun {
	const story = options.story;
	const effective = effectiveRun(story, options.overrides);
	assertPlayable(story, effective);
	assertCast(story, effective, options.overrides?.cast);
	const resume = options.resume;
	if (resume !== undefined) assertResumable(resume.point, story, effective);
	const request = options.snapshot;
	if (request !== undefined && request.atMinute === undefined && (request.afterLevel < effective.startLevel || request.afterLevel > effective.lastLevel)) {
		throw new SnapshotError(`A snapshot after level ${String(request.afterLevel)} is outside the played levels ${String(effective.startLevel)}-${String(effective.lastLevel)}`);
	}
	if (request !== undefined && request.atMinute === undefined && resume !== undefined && request.afterLevel <= resume.point.level) {
		throw new SnapshotError(`Every resident had passed level ${String(resume.point.level)} when the snapshot was taken; a new snapshot needs a later level`);
	}
	const names = resume === undefined ? effective.names : story.names !== undefined && namesOfSnapshot(resume.point);
	const run = hostRunOf(story, effective, options, names);
	const { definition: base } = hostStoryOf(story, run);

	const playsGamemaker = effective.gamemaker && story.gamemaker !== undefined;
	if (playsGamemaker && options.gamemakerModels === undefined) throw new Error("A run with a gamemaker needs gamemakerModels");
	const classifier = effective.classifier ? options.classifier : undefined;
	if (effective.classifier && classifier === undefined) throw new Error("A run with a classifier needs the classifier option");
	const weaving = options.overrides?.weaver === true;
	if (weaving && options.weaver === undefined) throw new Error("A run with the weaver needs the weaver option");

	// The legacy file's roles become the overseers' slices; a run that had no such role before starts it fresh.
	const legacyEntries =
		resume?.point.legacyRoles === undefined
			? {}
			: overseers.overseerEntriesAtResume(resume.point.legacyRoles, resume.point.host.seq, {
					...(classifier === undefined ? {} : { classifier: NAMES.classifier }),
					...(weaving ? { weaver: NAMES.weaver } : {}),
					...(playsGamemaker ? { gamemaker: NAMES.gamemaker } : {}),
				});
	const resumed: { readonly snapshot: HostSnapshot; readonly events: readonly EventEnvelope[] } | undefined =
		resume === undefined
			? undefined
			: {
					snapshot: Object.keys(legacyEntries).length === 0 ? resume.point.host : { ...resume.point.host, overseers: { ...resume.point.host.overseers, ...legacyEntries } },
					events: resume.point.events,
				};

	// The probe loads no overseers, so it gets the snapshot without their slices.
	const probeResume = resume === undefined ? undefined : { snapshot: withoutOverseers(resume.point.host), events: resume.point.events };
	const probe = probeHost(base, probeResume);
	const facts = startFacts(probe, story, run, options, effective.personas);
	const startLevel = effective.startLevel;
	const uses: OverseerUse[] = [
		...(classifier === undefined ? [] : [overseers.classifierOverseer.as(NAMES.classifier, { label: classifier.label, ...(classifier.maxChars === undefined ? {} : { maxChars: classifier.maxChars }) })]),
		...(weaving ? [overseers.weaverOverseer.as(NAMES.weaver, { characters: { ...facts.characters }, acts: (story.acts ?? []).map((act) => ({ fromLevel: act.fromLevel, title: act.title })), startLevel })] : []),
		...(playsGamemaker ? [gamemakerUse(story, effective, facts, classifier !== undefined, base.mechanics.map((use) => use.mechanic.id))] : []),
		...(options.judge === undefined ? [] : [overseers.judgeFor(options.judgeTemper ?? "fair").as(NAMES.judge)]),
	];
	const definition = uses.length === 0 ? base : defineCoreStory({ ...base, overseers: uses });

	const ref: { host?: Host; residents?: HostResidents } = {};
	const hostOf = (): Host => {
		if (ref.host === undefined) throw new Error("the host is not built yet");
		return ref.host;
	};
	const lazy = {
		record: (actor: Parameters<Host["record"]>[0], type: string, payload: unknown): void => {
			hostOf().record(actor, type, payload);
		},
		get minute(): number {
			return hostOf().minute;
		},
		get log(): Host["log"] {
			return hostOf().log;
		},
		get residents(): Host["residents"] {
			return hostOf().residents;
		},
	};
	const routes: Record<string, OverseerRuntime> = {};
	let gamemakerPrompt: string | undefined;
	const gamemakerModels = options.gamemakerModels;
	if (playsGamemaker && gamemakerModels !== undefined) {
		const spec = story.gamemaker;
		const models = gamemakerModels;
		const source = typeof models === "function" ? undefined : models;
		const maxOutputTokens = spec.model.maxOutputTokens;
		const limits = options.limits ?? { ...DEFAULT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
		let runtime: OverseerRuntime | undefined;
		routes.gamemaker = {
			ask: (call) => {
				runtime ??= gamemakerRuntime({
					host: lazy,
					binding: (source ?? (typeof models === "function" ? models(hostOf()) : models)).bind(GAMEMAKER_ID, limits),
					thinking: spec.model.thinking ?? "low",
					modelCallsPerTurn: spec.modelCallsPerTurn,
				});
				return runtime.ask(call);
			},
		};
		const use = uses.find((entry) => entry.name === NAMES.gamemaker);
		const system: unknown = use === undefined || typeof use.options !== "object" || use.options === null ? undefined : Reflect.get(use.options, "system");
		gamemakerPrompt = typeof system === "string" ? system : undefined;
	}
	if (classifier !== undefined) routes.classifier = classifier.runtime(lazy);
	if (weaving && options.weaver !== undefined) routes.weaver = options.weaver.runtime(lazy);
	if (options.judge !== undefined) routes.judge = options.judge.runtime(lazy);

	const host = createHost({
		story: definition,
		prompts: createPromptLookup(),
		app: { events: { ...RESIDENT_APP_EVENTS, ...GAMEMAKER_APP_EVENTS, ...overseers.USAGE_APP_EVENTS, ...RUN_RESUMED } },
		awaitsAnswer: (resident) => ref.residents?.awaitsAnswer(resident) ?? false,
		...(Object.keys(routes).length === 0 ? {} : { overseers: overseerRouter(routes) }),
		...(options.guardJudge === undefined || !effective.guards ? {} : { guard: hostGuard(options.guardJudge, hostOf) }),
		...(resumed === undefined ? {} : { resume: { snapshot: onlyDeclared(resumed.snapshot, uses), events: resumed.events } }),
	});
	ref.host = host;

	// The old sinks read the legacy log: a resumed run's prefix first (replayed, not recorded), then the run's own lines.
	const sinks = options.sinks;
	const replay = (event: RecordedEvent): void => {
		for (const sink of sinks) {
			if (sink.replay === undefined) sink.record(event);
			else sink.replay(event);
		}
	};
	let adapter: LegacyEventAdapter;
	if (resume?.point.legacyLines !== undefined) {
		for (const line of resume.point.legacyLines) replay(line);
		adapter = new LegacyEventAdapter({ lastSeq: resume.point.legacyLines.length });
	} else {
		adapter = new LegacyEventAdapter();
		for (const envelope of resume?.point.events ?? []) for (const line of adapter.write(envelope)) replay(toRecorded(line));
	}
	host.subscribe((envelope) => {
		for (const line of adapter.write(envelope)) {
			const event = toRecorded(line);
			for (const sink of sinks) sink.record(event);
		}
	});

	if (resume === undefined) host.start();
	else {
		const { point, name } = resume;
		host.record("host", "run_resumed", { snapshot: name, level: point.level, round: point.round, minutes: effective.minutes, ...(options.meta === undefined ? {} : { meta: options.meta }) });
	}

	const assignments = assignModels(story, host.residents, effective.seed, options.modelOverride);
	const source = typeof options.models === "function" ? options.models(host, assignments) : options.models;
	const deskRef: { desk?: WeaverDesk } = {};
	const residents = hostResidents({
		story,
		run,
		host,
		// The probe did the resume work the run's host does in its first minute (the late core motives).
		...(resume === undefined ? {} : { promptHost: probe }),
		models: source,
		personas: effective.personas,
		...(options.modelOverride === undefined ? {} : { modelOverride: options.modelOverride }),
		...(options.limits === undefined ? {} : { limits: options.limits }),
		...(options.thinking === undefined ? {} : { thinking: options.thinking }),
		...(options.promptAddenda === undefined ? {} : { promptAddenda: options.promptAddenda }),
		...(options.souffleur === undefined ? {} : { souffleur: options.souffleur }),
		// The runners are built before the desk (it rewrites their prompts), so each voice asks the desk when the step runs.
		...(weaving
			? {
					innerVoice: (agent: ResidentId): InnerVoice => ({
						take: () => deskRef.desk?.voice(agent).take() ?? [],
						giveBack: (voices) => {
							deskRef.desk?.voice(agent).giveBack(voices);
						},
					}),
				}
			: {}),
	});
	ref.residents = residents;
	const carried = resume?.point.weaver ?? legacyWeaver(resume?.point.legacyRoles);
	const desk = new WeaverDesk(hostOf, weaving ? NAMES.weaver : undefined, (agent, shift) => {
		residents.rewrite(agent, shift);
	}, carried);
	deskRef.desk = desk;
	// Who plays whom, after `run_start` or `run_resumed` (the old arena logged it in both).
	residents.recordProfiles();
	if (resume !== undefined) {
		for (const id of host.residents) residents.runner(id)?.restore(resume.point.competitors.find((entry) => entry.agent === id)?.messages ?? []);
		desk.applyCarried();
	}

	const take: TurnTaker = (turn) => {
		desk.sync(turn.resident);
		return residents.take(turn);
	};

	const snapshotFile = (cut: { readonly round: number; readonly minute: number; readonly brake?: { readonly act: string; readonly minute: number; readonly maxMinutes: number; readonly behind: readonly { readonly agent: string; readonly level: number }[] } }): RunFileOut => {
		const deskState = desk.state();
		return {
			format: RUN_FILE_FORMAT,
			version: RUN_FILE_VERSION,
			story: story.id,
			seed: effective.seed,
			agents: effective.agents,
			level: request?.atMinute === undefined ? (request?.afterLevel ?? 0) : passedByAll(host, effective.lastLevel),
			round: cut.round,
			minute: cut.minute,
			run: { startLevel: effective.startLevel, lastLevel: effective.lastLevel, minutes: effective.minutes, personas: effective.personas, ...(options.meta === undefined ? {} : { meta: { ...options.meta } }) },
			host: structuredClone(host.snapshot()),
			events: host.log.all().map((event) => structuredClone(event)),
			competitors: host.residents.map((agent) => ({ agent, messages: [...(residents.runner(agent)?.snapshot() ?? [])] })),
			...(deskState.heard.length === 0 && deskState.shifts.length === 0 ? {} : { weaver: { heard: [...deskState.heard], shifts: [...deskState.shifts] } }),
			...(cut.brake === undefined ? {} : { brake: { act: cut.brake.act, minute: cut.brake.minute, maxMinutes: cut.brake.maxMinutes, behind: cut.brake.behind.map((entry) => ({ ...entry })) } }),
		};
	};

	return {
		story,
		effective,
		host,
		residents,
		profiles: residents.profiles,
		...(gamemakerPrompt === undefined ? {} : { gamemakerPrompt }),
		async run() {
			for (;;) {
				const end = await host.playMinute(take);
				if (end !== undefined) return end;
				// A scripted minute settles in microtasks only; one macrotask turn per minute lets timers,
				// signals and a test worker's messages through during a long offline run.
				await new Promise((resolve) => setImmediate(resolve));
				const due = host.facts()["arena.snapshot"];
				if (request === undefined || due === null || due === undefined || !Check(Cut, due)) continue;
				request.write(snapshotFile(due));
				if (due.stop) host.stop("snapshot");
			}
		},
	};
}

const LegacyWeaver = Type.Object({ weaver: Type.Object({ shifts: Type.Array(Type.Object({ agent: Type.String(), text: Type.String() })) }, { additionalProperties: true }) }, { additionalProperties: true });

/** The hard texts an old file carries (its weaver's `shifts`), for a run that plays on without the weaver. */
function legacyWeaver(roles: unknown): { readonly heard: readonly { readonly agent: string; readonly text: string }[]; readonly shifts: readonly { readonly agent: string; readonly text: string }[] } | undefined {
	if (!Check(LegacyWeaver, roles)) return undefined;
	return { heard: [], shifts: roles.weaver.shifts };
}

const DealtMotives = Type.Record(Type.String(), Type.Object({ bigFive: Type.Array(CoreMotiveTraitSchema), drives: Type.Array(CoreMotiveDriveSchema), figure: Type.Optional(Type.String()) }));
const Names = Type.Record(Type.String(), Type.String());

/** Who every resident is (`cast/<ID>-<figure>.md`): its dealt core motive and its name, from the host's facts. */
export function castEntries(host: Host): readonly CastEntry[] {
	const facts = host.facts();
	const motives = facts["motives.coreMotives"];
	const names = facts["names.names"];
	if (!Check(DealtMotives, motives)) return [];
	return host.residents.flatMap((agent) => {
		const coreMotive = motives[agent];
		const name = Check(Names, names) ? names[agent] : undefined;
		return coreMotive === undefined ? [] : [{ agent, coreMotive, ...(name === undefined ? {} : { name }) }];
	});
}

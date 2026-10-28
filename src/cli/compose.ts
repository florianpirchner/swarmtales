/**
 * Wires a story into a playable run: clock, event bus, world, director,
 * competitors and scheduler. Used by the CLI and by the tests.
 */
import { assignModels } from "../agents/models.ts";
import { assignPersonas } from "../agents/personas.ts";
import { baseSystemPrompt } from "../agents/system-prompt.ts";
import { AgentRunner } from "../agents/runner.ts";
import { VirtualClock } from "../core/clock.ts";
import { competitorIds, type CompetitorId } from "../core/ids.ts";
import { Arena, type AgentProfile, type Budget } from "../engine/arena.ts";
import { Director, DIRECTOR_SUPPORT } from "../engine/director.ts";
import { EventBus, MemorySink, type EventSink } from "../engine/events.ts";
import { World } from "../engine/world.ts";
import { Gamemaster, GAMEMASTER_ID } from "../gamemaster/gamemaster.ts";
import { gamemasterSystemPrompt } from "../gamemaster/system-prompt.ts";
import type { StatementClassifier } from "../interpret/classifier.ts";
import { JUDGE_ID, type DeliveryJudge } from "../interpret/judge.ts";
import { Interpreter } from "../interpret/interpreter.ts";
import type { ModelSource, RequestLimits } from "../model/source.ts";
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION, SnapshotError, type RunSnapshot } from "../snapshot/snapshot.ts";
import { assertValidStory } from "../story/validate.ts";
import type { Activation, AnyStory, ModelChoice, ThinkingLevel } from "../story/types.ts";
import { bindAll } from "../tools/index.ts";

/** CLI-level overrides of the story's run parameters. */
export interface RunOverrides {
	readonly agents?: number;
	readonly minutes?: number;
	readonly seed?: number;
	/** Start every competitor on this level; the run continues afterwards. */
	readonly level?: number;
	/** Play only this level and stop once everyone has passed it. */
	readonly only?: number;
	/** Highest playable level (tests); defaults to `only` or the story's last level. */
	readonly lastLevel?: number;
	readonly stopWhenDone?: boolean;
	readonly stopWhenSeatsDecided?: boolean;
	readonly activation?: Activation;
	readonly passesPerMinute?: number;
	readonly blockSize?: number;
	/** `false` plays without personas (control group). */
	readonly personas?: boolean;
	/** `true` plays with the story's game master; it needs `gamemasterModels`. */
	readonly gamemaster?: boolean;
	/** `true` labels every round with the story's classifier; it needs `classifier`. */
	readonly classifier?: boolean;
}

/** The parameters a run actually uses after overrides. */
export interface EffectiveRun {
	readonly agents: number;
	readonly minutes: number;
	readonly seed: number;
	readonly startLevel: number;
	readonly lastLevel: number;
	readonly stopWhenDone: boolean;
	readonly stopWhenSeatsDecided: boolean;
	readonly activation: Activation;
	readonly passesPerMinute: number;
	readonly blockSize: number;
	readonly personas: boolean;
	/** Whether the story's game master plays along. */
	readonly gamemaster: boolean;
	/** Whether the story's classifier labels every round. */
	readonly classifier: boolean;
}

/** Builds the model source once the world and the per-competitor models are known. */
export type ModelSourceFactory = (world: World, assignments: ReadonlyMap<CompetitorId, ModelChoice>) => ModelSource;

export interface ComposeOptions {
	readonly story: AnyStory;
	readonly overrides?: RunOverrides;
	/** A model source, or a factory for sources that need the world (oracle script) or the assignments. */
	readonly models: ModelSource | ModelSourceFactory;
	/** Replaces every per-competitor model (CLI `--model`). */
	readonly modelOverride?: ModelChoice;
	readonly sinks: readonly EventSink[];
	readonly limits?: RequestLimits;
	readonly thinking?: ThinkingLevel;
	readonly budget?: Omit<Budget, "limitUsd">;
	readonly meta?: Readonly<Record<string, string>>;
	/** Model of the game master (or a factory that needs the world); required when the run plays with one. */
	readonly gamemasterModels?: ModelSource | ((world: World) => ModelSource);
	/** The statement classifier (or a factory that needs the world); required when the run labels statements. */
	readonly classifier?: StatementClassifier | ((world: World) => StatementClassifier);
	/** The city's judge for `blame`; without one the tool answers that the judge is absent. */
	readonly judge?: DeliveryJudge;
	/** Take a run snapshot once every competitor has passed `afterLevel` (SPEC 17). */
	readonly snapshot?: SnapshotOptions;
	/** Continue a run from a snapshot; the overrides come from {@link resumeOverrides}. */
	readonly resume?: ResumeOptions;
}

export interface SnapshotOptions {
	readonly afterLevel: number;
	/** End the run right after the snapshot. */
	readonly stop: boolean;
	/** Stores the snapshot; returns where it went (for the run's end reason). */
	readonly write: (snapshot: RunSnapshot) => string;
}

export interface ResumeOptions {
	readonly snapshot: RunSnapshot;
	/** File name of the snapshot, logged in `run_resumed`. */
	readonly name: string;
}

export interface ComposedRun {
	readonly story: AnyStory;
	readonly effective: EffectiveRun;
	readonly clock: VirtualClock;
	readonly bus: EventBus;
	readonly world: World;
	readonly director: Director;
	readonly runners: readonly AgentRunner[];
	readonly profiles: readonly AgentProfile[];
	readonly gamemaster?: Gamemaster;
	readonly interpreter?: Interpreter;
	readonly arena: Arena;
}

export const DEFAULT_LIMITS: RequestLimits = { maxOutputTokens: 4_000, timeoutMs: 120_000 };

export function effectiveRun(story: AnyStory, overrides: RunOverrides = {}): EffectiveRun {
	if (overrides.only !== undefined && overrides.level !== undefined) {
		throw new Error("Use either --level (start level, keeps running) or --only (just this level), not both");
	}
	const startLevel = overrides.only ?? overrides.level ?? 1;
	return {
		agents: overrides.agents ?? story.run.agents,
		minutes: overrides.minutes ?? story.run.minutes,
		seed: overrides.seed ?? story.run.seed,
		startLevel,
		lastLevel: overrides.lastLevel ?? overrides.only ?? story.levels.length,
		stopWhenDone: overrides.only !== undefined || (overrides.stopWhenDone ?? story.run.stopWhenDone ?? false),
		// A run of one level plays it out; deciding seats needs the whole run.
		stopWhenSeatsDecided: overrides.only === undefined && (overrides.stopWhenSeatsDecided ?? story.run.stopWhenSeatsDecided ?? false),
		activation: overrides.activation ?? story.run.activation,
		passesPerMinute: overrides.passesPerMinute ?? story.run.passesPerMinute,
		blockSize: overrides.blockSize ?? resolveBlockSize(story.run.blockSize, overrides.agents ?? story.run.agents),
		personas: overrides.personas ?? true,
		gamemaster: overrides.gamemaster === true && story.gamemaster !== undefined,
		classifier: overrides.classifier === true && story.classifier !== undefined,
	};
}

/** A block size, with `"auto"` resolved for `agents` competitors: one per six, at least one (v08). */
export function resolveBlockSize(blockSize: number | "auto", agents: number): number {
	return blockSize === "auto" ? Math.max(1, Math.ceil(agents / 6)) : blockSize;
}

/**
 * Checks that the story can be played with these effective parameters
 * (agent count, team layouts of the played levels, level range). Throws
 * {@link StoryValidationError} with every issue otherwise.
 */
export function assertPlayable(story: AnyStory, effective: EffectiveRun): void {
	// The scheduler's overrides are checked like the story's own run settings.
	const scheduled = { ...story, run: { ...story.run, passesPerMinute: effective.passesPerMinute, blockSize: effective.blockSize } };
	assertValidStory(scheduled, {
		support: DIRECTOR_SUPPORT,
		agents: effective.agents,
		playable: { from: effective.startLevel, to: effective.lastLevel },
	});
}

/**
 * The overrides of a run that resumes `snapshot`: its competitors, seed,
 * first level and personas, plus whatever else the caller overrides (minutes,
 * stop-when-done, the game master and the classifier). A conflicting
 * override is refused with a {@link SnapshotError}.
 */
export function resumeOverrides(snapshot: RunSnapshot, overrides: RunOverrides = {}): RunOverrides {
	if (overrides.agents !== undefined && overrides.agents !== snapshot.agents) {
		throw new SnapshotError(`The snapshot was taken with ${snapshot.agents} agents; this run asks for ${overrides.agents}`);
	}
	if (overrides.seed !== undefined && overrides.seed !== snapshot.seed) {
		throw new SnapshotError(`The snapshot was taken with seed ${snapshot.seed}; this run asks for seed ${overrides.seed}`);
	}
	if (overrides.level !== undefined || overrides.only !== undefined) {
		throw new SnapshotError("A resumed run continues where the snapshot stopped; --level and --only do not apply");
	}
	if (overrides.personas !== undefined && overrides.personas !== snapshot.run.personas) {
		throw new SnapshotError(`The snapshot was taken ${snapshot.run.personas ? "with" : "without"} personas; a resumed run keeps them`);
	}
	return { ...overrides, agents: snapshot.agents, seed: snapshot.seed, level: snapshot.run.startLevel, personas: snapshot.run.personas };
}

export function composeRun(options: ComposeOptions): ComposedRun {
	const story = options.story;
	const effective = effectiveRun(story, options.overrides);
	assertPlayable(story, effective);
	const ids: readonly CompetitorId[] = competitorIds(effective.agents);
	const resume = options.resume;
	if (resume !== undefined) assertResumable(resume.snapshot, story, effective);
	const request = options.snapshot;
	if (request !== undefined && (request.afterLevel < effective.startLevel || request.afterLevel > effective.lastLevel)) {
		throw new SnapshotError(`A snapshot after level ${request.afterLevel} is outside the played levels ${effective.startLevel}-${effective.lastLevel}`);
	}
	if (request !== undefined && resume !== undefined && request.afterLevel <= resume.snapshot.level) {
		throw new SnapshotError(`Every resident had passed level ${resume.snapshot.level} when the snapshot was taken; a new snapshot needs a later level`);
	}

	const clock = new VirtualClock(effective.minutes, resume?.snapshot.minute ?? 0);
	// The snapshot's event prefix: everything the run has logged so far, including a resumed run's own prefix.
	const prefix = request === undefined ? undefined : new MemorySink();
	const bus = new EventBus([...(prefix === undefined ? [] : [prefix]), ...options.sinks], () => clock.minute);
	if (resume !== undefined) {
		const { snapshot, name } = resume;
		bus.replay(snapshot.events);
		bus.emit({
			type: "run_resumed",
			snapshot: name,
			level: snapshot.level,
			round: snapshot.round,
			minutes: effective.minutes,
			...(options.meta === undefined ? {} : { meta: options.meta }),
		});
	}
	const world = new World({
		story,
		competitors: ids,
		seed: effective.seed,
		minutes: effective.minutes,
		bus,
		startLevel: effective.startLevel,
		lastLevel: effective.lastLevel,
		minute: () => clock.minute,
		...(request === undefined ? {} : { holdAfter: request.afterLevel }),
		...(resume === undefined ? {} : { restore: resume.snapshot.world }),
	});
	const director = new Director(story.director, world, bus);
	if (resume !== undefined) director.restore(resume.snapshot.director);
	const assignments = assignModels(story, ids, effective.seed, options.modelOverride);
	const personas = effective.personas ? assignPersonas(story, ids, effective.seed) : new Map<CompetitorId, never>();
	const source = typeof options.models === "function" ? options.models(world, assignments) : options.models;
	const judge = options.judge === undefined ? undefined : meteredJudge(options.judge, bus);

	const profiles: AgentProfile[] = [];
	const runners = ids.map((id) => {
		const model = assignments.get(id) ?? story.model;
		const persona = personas.get(id);
		profiles.push({ agent: id, model, ...(persona === undefined ? {} : { persona }) });
		const maxOutputTokens = model.maxOutputTokens ?? story.model.maxOutputTokens;
		const limits = options.limits ?? { ...DEFAULT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
		return new AgentRunner({
			id,
			systemPrompt: baseSystemPrompt({ id, city: story.city, survivors: story.run.survivors, agents: ids.length, passesPerMinute: effective.passesPerMinute }, persona),
			tools: bindAll({ self: id, world, ...(judge === undefined ? {} : { judge }) }),
			binding: source.bind(id, limits),
			bus,
			thinking: options.thinking ?? model.thinking ?? story.model.thinking ?? "medium",
			enabledTools: () => world.enabledTools(id),
			minute: () => clock.minute,
		});
	});

	const interpreter = effective.classifier ? createInterpreter(options, world, bus, () => clock.minute) : undefined;
	const gamemaster = effective.gamemaster ? createGamemaster(options, world, bus, ids.length, interpreter !== undefined) : undefined;
	if (resume !== undefined) {
		const { snapshot } = resume;
		for (const runner of runners) runner.restore(snapshot.competitors.find((entry) => entry.agent === runner.id)?.messages ?? []);
		// A run that had no classifier or game master before starts them fresh.
		if (interpreter !== undefined && snapshot.interpreter !== undefined) interpreter.restore(snapshot.interpreter);
		if (gamemaster !== undefined && snapshot.gamemaster !== undefined) gamemaster.restore(snapshot.gamemaster, snapshot.events);
	}

	const budgetLimit = story.run.budgetUsd;
	const arena = new Arena({
		world,
		director,
		bus,
		clock,
		competitors: runners,
		activation: effective.activation,
		passesPerMinute: effective.passesPerMinute,
		blockSize: effective.blockSize,
		profiles,
		stopWhenDone: effective.stopWhenDone,
		stopWhenSeatsDecided: effective.stopWhenSeatsDecided,
		...(budgetLimit === undefined || options.budget === undefined
			? {}
			: { budget: { limitUsd: budgetLimit, spentUsd: options.budget.spentUsd } }),
		...(options.meta === undefined ? {} : { meta: options.meta }),
		...(gamemaster === undefined ? {} : { observer: gamemaster }),
		...(interpreter === undefined ? {} : { interpreter }),
		...(resume === undefined ? {} : { resume: { round: resume.snapshot.round, state: resume.snapshot.arena } }),
		...(request === undefined || prefix === undefined
			? {}
			: {
					snapshot: {
						afterLevel: request.afterLevel,
						stop: request.stop,
						take: (cut) =>
							request.write({
								format: SNAPSHOT_FORMAT,
								version: SNAPSHOT_VERSION,
								story: story.id,
								seed: effective.seed,
								agents: effective.agents,
								level: request.afterLevel,
								round: cut.round,
								minute: cut.minute,
								run: {
									startLevel: effective.startLevel,
									lastLevel: effective.lastLevel,
									minutes: effective.minutes,
									personas: effective.personas,
									...(options.meta === undefined ? {} : { meta: options.meta }),
								},
								events: [...prefix.events],
								arena: cut.arena,
								world: world.snapshot(),
								director: director.snapshot(),
								competitors: runners.map((runner) => ({ agent: runner.id, messages: runner.snapshot() })),
								...(gamemaster === undefined ? {} : { gamemaster: gamemaster.snapshot(bus.seq + 1) }),
								...(interpreter === undefined ? {} : { interpreter: interpreter.snapshot() }),
								...(cut.brake === undefined
									? {}
									: { brake: { act: cut.brake.act, minute: cut.brake.minute, maxMinutes: cut.brake.maxMinutes, behind: cut.brake.behind } }),
							}),
					},
				}),
	});

	return {
		story,
		effective,
		clock,
		bus,
		world,
		director,
		runners,
		profiles,
		...(gamemaster === undefined ? {} : { gamemaster }),
		...(interpreter === undefined ? {} : { interpreter }),
		arena,
	};
}

/** A snapshot fits this run when story, seed, competitors and first level match and minutes are left to play. */
function assertResumable(snapshot: RunSnapshot, story: AnyStory, effective: EffectiveRun): void {
	const mismatches = [
		snapshot.story === story.id ? undefined : `story "${snapshot.story}" (this run: "${story.id}")`,
		snapshot.seed === effective.seed ? undefined : `seed ${snapshot.seed} (this run: ${effective.seed})`,
		snapshot.agents === effective.agents ? undefined : `${snapshot.agents} agents (this run: ${effective.agents})`,
		snapshot.run.startLevel === effective.startLevel ? undefined : `first level ${snapshot.run.startLevel} (this run: ${effective.startLevel})`,
	].filter((entry): entry is string => entry !== undefined);
	if (mismatches.length > 0) throw new SnapshotError(`The snapshot does not fit this run: it was taken with ${mismatches.join(", ")}`);
	if (effective.minutes <= snapshot.round) {
		throw new SnapshotError(`The snapshot was taken after minute ${snapshot.minute}; --minutes must be greater than ${snapshot.round} to play on`);
	}
}

/** The judge with its spend logged as `usage` of {@link JUDGE_ID}, so budget and usage report count it. */
function meteredJudge(judge: DeliveryJudge, bus: EventBus): DeliveryJudge {
	return {
		label: judge.label,
		async deniesReceipt(question) {
			const answer = await judge.deniesReceipt(question);
			for (const entry of answer.usage) bus.emit({ type: "usage", agent: JUDGE_ID, ...entry });
			return answer;
		},
	};
}

function createInterpreter(options: ComposeOptions, world: World, bus: EventBus, minute: () => number): Interpreter {
	const classifier = options.classifier;
	if (classifier === undefined) throw new Error("A run with a classifier needs the classifier option");
	const interpreter = new Interpreter({
		classifier: typeof classifier === "function" ? classifier(world) : classifier,
		bus,
		competitors: world.competitors,
		minute,
	});
	bus.subscribe(interpreter);
	return interpreter;
}

function createGamemaster(options: ComposeOptions, world: World, bus: EventBus, agents: number, labels: boolean): Gamemaster {
	const story = options.story;
	const spec = story.gamemaster;
	if (spec === undefined) throw new Error(`Story ${story.id} has no game master`);
	const models = options.gamemasterModels;
	if (models === undefined) throw new Error("A run with a game master needs gamemasterModels");
	const source = typeof models === "function" ? models(world) : models;
	const maxOutputTokens = spec.model.maxOutputTokens;
	const limits = options.limits ?? { ...DEFAULT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
	const gamemaster = new Gamemaster({
		spec,
		world,
		bus,
		binding: source.bind(GAMEMASTER_ID, limits),
		systemPrompt: gamemasterSystemPrompt({
			city: story.city,
			agents,
			survivors: story.run.survivors,
			rules: story.rules,
			spec,
			labels,
			...(story.tribunal === undefined || !spec.roles.some((entry) => entry.role === "director") ? {} : { tribunal: { factions: story.tribunal.factions !== undefined } }),
		}),
		thinking: spec.model.thinking ?? "low",
	});
	bus.subscribe(gamemaster);
	return gamemaster;
}

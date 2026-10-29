/**
 * Wires a story into a playable run: clock, event bus, world, director,
 * competitors and scheduler. Used by the CLI and by the tests.
 */
import { assignModels } from "../agents/models.ts";
import { assignPersonas } from "../agents/personas.ts";
import { baseSystemPrompt, type PromptFacts } from "../agents/system-prompt.ts";
import { renderCore } from "../engine/cores.ts";
import { DEFAULT_DIRECTION, briefLine, directFigure, directionBlock, directionLevel, figureOf, FigureCues, type DirectionLevel, type FigureCue } from "../engine/direction.ts";
import { AgentRunner } from "../agents/runner.ts";
import { VirtualClock } from "../core/clock.ts";
import { competitorIds, type CompetitorId } from "../core/ids.ts";
import { Arena, type AgentProfile, type Budget } from "../engine/arena.ts";
import { Director, DIRECTOR_SUPPORT } from "../engine/director.ts";
import { EventBus, MemorySink, type EventSink } from "../engine/events.ts";
import { World } from "../engine/world.ts";
import { Gamemaker, GAMEMAKER_ID } from "../gamemaker/gamemaker.ts";
import { gamemakerSystemPrompt } from "../gamemaker/system-prompt.ts";
import type { StatementClassifier } from "../interpret/classifier.ts";
import { JUDGE_ID, type DeliveryJudge } from "../interpret/judge.ts";
import { SOUFFLEUR_ID, type Souffleur } from "../interpret/souffleur.ts";
import { Interpreter } from "../interpret/interpreter.ts";
import { Weaver } from "../interpret/weaver.ts";
import type { WeaverModel } from "../interpret/weaver-model.ts";
import type { ModelSource, RequestLimits } from "../model/source.ts";
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION, SnapshotError, type RunSnapshot } from "../snapshot/snapshot.ts";
import { assertValidStory } from "../story/validate.ts";
import type { Activation, AnyStory, ModelChoice, Persona, ThinkingLevel } from "../story/types.ts";
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
	/** `true` plays with the story's gamemaker; it needs `gamemakerModels`. */
	readonly gamemaker?: boolean;
	/** `true` labels every round with the story's classifier; it needs `classifier`. */
	readonly classifier?: boolean;
	/** `false` keeps IDs although the story has names (v08); a resumed run keeps the snapshot's. */
	readonly names?: boolean;
	/** `false` plays without character cores although the story has them (v09, `--no-cores`). */
	readonly cores?: boolean;
	/** The cast figures to play, by ID (`--cast`); seeded from the story's cast when omitted. */
	readonly cast?: readonly string[];
	/** How strongly a figure's prompt steers it, 0-10 (`--figure-direction`, src/engine/direction.ts). */
	readonly figureDirection?: number;
	/** How strongly the gamemaker steers, 0-10 (`--gm-direction`). */
	readonly gmDirection?: number;
	/** `true` lets the weaver change who residents are (`--weaver`); it needs the `weaver` option. */
	readonly weaver?: boolean;
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
	/** Whether the story's gamemaker plays along. */
	readonly gamemaker: boolean;
	/** Whether the story's classifier labels every round. */
	readonly classifier: boolean;
	/** Whether residents choose names: the story has them and the run starts on its first level (v08). */
	readonly names: boolean;
	/** Whether residents have character cores: the story has them and the run does not turn them off (v09). */
	readonly cores: boolean;
	/** The direction levels the run plays (default 4 each, as v12). */
	readonly figureDirection: DirectionLevel;
	readonly gmDirection: DirectionLevel;
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
	/** Model of the gamemaker (or a factory that needs the world); required when the run plays with one. */
	readonly gamemakerModels?: ModelSource | ((world: World) => ModelSource);
	/** The statement classifier (or a factory that needs the world); required when the run labels statements. */
	readonly classifier?: StatementClassifier | ((world: World) => StatementClassifier);
	/** The city's judge for `blame`; without one the tool answers that the judge is absent. */
	readonly judge?: DeliveryJudge;
	/** Rewrites a resident's step the provider's safeguards refused (P44). */
	readonly souffleur?: Souffleur;
	/** The weaver's model (or a factory that needs the world); required when the run plays with the weaver. */
	readonly weaver?: WeaverModel | ((world: World) => WeaverModel);
	/** Take a run snapshot once every competitor has passed `afterLevel` (SPEC 17). */
	readonly snapshot?: SnapshotOptions;
	/** Continue a run from a snapshot; the overrides come from {@link resumeOverrides}. */
	readonly resume?: ResumeOptions;
	/** Texts appended to the system prompt (prompt experiments, `lab/`): of every competitor, or of `agent` alone. */
	readonly promptAddenda?: readonly { readonly agent?: CompetitorId; readonly text: string }[];
}

export interface SnapshotOptions {
	readonly afterLevel: number;
	/** Take it at the first round boundary at or after this minute instead; its level is the highest every resident has passed. */
	readonly atMinute?: number;
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
	readonly gamemaker?: Gamemaker;
	readonly interpreter?: Interpreter;
	readonly weaver?: Weaver;
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
		gamemaker: overrides.gamemaker === true && story.gamemaker !== undefined,
		classifier: overrides.classifier === true && story.classifier !== undefined,
		names: story.names !== undefined && startLevel === 1 && (overrides.names ?? true),
		cores: story.cores !== undefined && (overrides.cores ?? true),
		figureDirection: overrides.figureDirection === undefined ? DEFAULT_DIRECTION : directionLevel(overrides.figureDirection),
		gmDirection: overrides.gmDirection === undefined ? DEFAULT_DIRECTION : directionLevel(overrides.gmDirection),
	};
}

/**
 * What the system prompt says about names (v08). It is the same in a resumed
 * run, so the run goes on exactly as before; the resident's own name is in its context.
 */
function namesFact(world: World): Pick<PromptFacts, "names"> {
	const untilMinute = world.namesUntil;
	return untilMinute === undefined ? {} : { names: { untilMinute } };
}

/** The resident's core in prose for its system prompt (v09); dealt by the world, kept in its snapshot. */
function coreFact(world: World, agent: CompetitorId): Pick<PromptFacts, "core" | "frame"> {
	const spec = world.story.cores;
	const core = world.coreOf(agent);
	if (spec === undefined || core === undefined) return {};
	return { core: renderCore(spec, core), ...(spec.frame === undefined ? {} : { frame: spec.frame }) };
}

/** The figures a run names (`--cast`): the story has a cast with each of them, and there are no more than residents. */
function assertCast(story: AnyStory, effective: EffectiveRun, cast: readonly string[] | undefined): void {
	if (cast === undefined) return;
	const figures = story.cores?.figures ?? [];
	if (!effective.cores || figures.length === 0) throw new SnapshotError(`The story ${story.id} has no cast to play`);
	const unknown = cast.filter((id) => !figures.some((figure) => figure.id === id));
	if (unknown.length > 0) throw new SnapshotError(`Unknown figures ${unknown.join(", ")}; the cast has ${figures.map((figure) => figure.id).join(", ")}`);
	if (cast.length > effective.agents) throw new SnapshotError(`The cast names ${cast.length} figures for ${effective.agents} residents`);
}

/** A cast figure plays the persona of its profession, so its voice and its figure agree. */
function figurePersona(world: World, agent: CompetitorId): Persona | undefined {
	const id = world.coreOf(agent)?.figure;
	const profession = id === undefined ? undefined : world.story.cores?.figures?.find((figure) => figure.id === id)?.profession;
	return profession === undefined ? undefined : world.story.personas.find((persona) => persona.name.toLowerCase() === profession.toLowerCase());
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
 * stop-when-done, the gamemaker and the classifier). A conflicting
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
	if (overrides.cast !== undefined && (snapshot.world.cores ?? []).length > 0) {
		throw new SnapshotError("The snapshot's residents already have their cores; --cast applies only to a fresh run");
	}
	return { ...overrides, agents: snapshot.agents, seed: snapshot.seed, level: snapshot.run.startLevel, personas: snapshot.run.personas };
}

export function composeRun(options: ComposeOptions): ComposedRun {
	const story = options.story;
	const effective = effectiveRun(story, options.overrides);
	assertPlayable(story, effective);
	assertCast(story, effective, options.overrides?.cast);
	const ids: readonly CompetitorId[] = competitorIds(effective.agents);
	const resume = options.resume;
	if (resume !== undefined) assertResumable(resume.snapshot, story, effective);
	const request = options.snapshot;
	if (request !== undefined && request.atMinute === undefined && (request.afterLevel < effective.startLevel || request.afterLevel > effective.lastLevel)) {
		throw new SnapshotError(`A snapshot after level ${request.afterLevel} is outside the played levels ${effective.startLevel}-${effective.lastLevel}`);
	}
	if (request !== undefined && request.atMinute === undefined && resume !== undefined && request.afterLevel <= resume.snapshot.level) {
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
		names: effective.names,
		cores: effective.cores,
		...(options.overrides?.cast === undefined ? {} : { cast: options.overrides.cast }),
		// At gm direction 10 the gamemaker orders scenes, and a resident may refuse one (defy).
		defiance: story.gamemaker !== undefined && effective.gmDirection >= 10,
	});
	const director = new Director(story.director, world, bus);
	if (resume !== undefined) director.restore(resume.snapshot.director);
	const assignments = assignModels(story, ids, effective.seed, options.modelOverride);
	const personas = effective.personas ? assignPersonas(story, ids, effective.seed) : new Map<CompetitorId, never>();
	const source = typeof options.models === "function" ? options.models(world, assignments) : options.models;
	const judge = options.judge === undefined ? undefined : meteredJudge(options.judge, bus);
	const souffleur = options.souffleur === undefined ? undefined : meteredSouffleur(options.souffleur, bus);

	const figures = story.cores?.figures;
	// Rivals still in the city; an exiled one is no longer faced.
	const playedBy = (figure: string): CompetitorId | undefined => world.alive.find((agent) => world.coreOf(agent)?.figure === figure);
	// Residents follow the notes as orders only when the director gives orders (gm direction 10).
	// Without a live gamemaker (the lab), its orders come from the scene as notes in its name.
	const author = effective.gmDirection >= 10 ? story.gamemaker?.author : undefined;
	const cues = new Map<CompetitorId, FigureCue>();
	const profiles: AgentProfile[] = [];
	const prompts = new Map<CompetitorId, (shift: string | undefined) => string>();
	/** The character part of each prompt, unchanged: what the weaver reads as who a resident is. */
	const characters = new Map<CompetitorId, string>();
	/** Rebuilds a resident's system prompt with the weaver's text as who it has become. */
	const rewrite = (agent: CompetitorId, shift: string): void => {
		const promptOf = prompts.get(agent);
		if (promptOf !== undefined) runners.find((runner) => runner.id === agent)?.rewriteSystemPrompt(promptOf(shift));
	};
	const weaver = options.overrides?.weaver === true ? createWeaver(options, world, bus, (agent) => characters.get(agent) ?? "", rewrite) : undefined;
	const runners = ids.map((id) => {
		const model = assignments.get(id) ?? story.model;
		const figure = figureOf(figures, world.coreOf(id)?.figure);
		// From figure direction 6 a figure speaks for itself: no persona block beside it.
		const led = figure !== undefined && effective.figureDirection >= 6;
		const directed = directFigure(effective.figureDirection, figure?.direction, playedBy);
		const block = directed === undefined ? undefined : directionBlock(directed, (text) => world.display(text), author);
		const core = coreFact(world, id);
		if (directed !== undefined && core.core !== undefined) {
			const brief = briefLine(directed);
			cues.set(id, { ...(brief === undefined ? {} : { brief }), full: [core.core, ...(block === undefined ? [] : [block])].join("\n\n") });
		}
		const persona = effective.personas && !led ? (figurePersona(world, id) ?? personas.get(id)) : undefined;
		profiles.push({ agent: id, model, ...(persona === undefined ? {} : { persona }) });
		const maxOutputTokens = model.maxOutputTokens ?? story.model.maxOutputTokens;
		const limits = options.limits ?? { ...DEFAULT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
		// The prompt is a function of facts a resume keeps, and of the weaver's last hard text (`shift`).
		const promptOf = (shift: string | undefined): string => {
			const base = baseSystemPrompt(
				{
					id,
					city: story.city,
					survivors: story.run.survivors,
					agents: ids.length,
					passesPerMinute: effective.passesPerMinute,
					...namesFact(world),
					...core,
					...(led ? { direction: { level: effective.figureDirection, ...(block === undefined ? {} : { block }) } } : {}),
					...(shift === undefined ? {} : { shift }),
				},
				persona,
			);
			return [base, ...(options.promptAddenda ?? []).filter((entry) => entry.agent === undefined || entry.agent === id).map((entry) => entry.text.trim())].join("\n\n");
		};
		prompts.set(id, promptOf);
		characters.set(id, core.core ?? (persona === undefined ? "" : personaText(persona)));
		return new AgentRunner({
			id,
			systemPrompt: promptOf(undefined),
			tools: bindAll({ self: id, world, ...(judge === undefined ? {} : { judge }) }),
			binding: source.bind(id, limits),
			bus,
			thinking: options.thinking ?? model.thinking ?? story.model.thinking ?? "medium",
			enabledTools: () => world.enabledTools(id),
			minute: () => clock.minute,
			...(souffleur === undefined ? {} : { souffleur }),
			...(weaver === undefined ? {} : { innerVoice: () => weaver.takeVoices(id) }),
		});
	});

	const interpreter = effective.classifier ? createInterpreter(options, world, bus, () => clock.minute) : undefined;
	const gamemaker = effective.gamemaker ? createGamemaker(options, world, bus, ids.length, interpreter !== undefined, effective.gmDirection) : undefined;
	// A run without the weaver keeps who the residents have become and hands it on to its own snapshot.
	const carriedWeaver = weaver === undefined ? resume?.snapshot.weaver : undefined;
	if (resume !== undefined) {
		const { snapshot } = resume;
		for (const runner of runners) runner.restore(snapshot.competitors.find((entry) => entry.agent === runner.id)?.messages ?? []);
		// A run that had no classifier or gamemaker before starts them fresh.
		if (interpreter !== undefined && snapshot.interpreter !== undefined) interpreter.restore(snapshot.interpreter);
		if (gamemaker !== undefined && snapshot.gamemaker !== undefined) gamemaker.restore(snapshot.gamemaker, snapshot.events);
		if (weaver !== undefined) weaver.restore(snapshot.weaver, snapshot.events);
		for (const entry of carriedWeaver?.shifts ?? []) rewrite(entry.agent, entry.text);
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
		...(gamemaker === undefined ? {} : { observer: gamemaker }),
		...(interpreter === undefined ? {} : { interpreter }),
		...(weaver === undefined ? {} : { weaver }),
		...(resume === undefined ? {} : { resume: { round: resume.snapshot.round, state: resume.snapshot.arena } }),
		...(cues.size === 0 ? {} : { cues: new FigureCues(cues) }),
		...(request === undefined || prefix === undefined
			? {}
			: {
					snapshot: {
						afterLevel: request.afterLevel,
						...(request.atMinute === undefined ? {} : { atMinute: request.atMinute }),
						stop: request.stop,
						take: (cut) =>
							request.write({
								format: SNAPSHOT_FORMAT,
								version: SNAPSHOT_VERSION,
								story: story.id,
								seed: effective.seed,
								agents: effective.agents,
								level: request.atMinute === undefined ? request.afterLevel : passedByAll(world, effective.lastLevel),
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
								...(gamemaker === undefined ? {} : { gamemaker: gamemaker.snapshot(bus.seq + 1) }),
								...(interpreter === undefined ? {} : { interpreter: interpreter.snapshot() }),
								...(weaver === undefined ? (carriedWeaver === undefined ? {} : { weaver: carriedWeaver }) : { weaver: weaver.snapshot() }),
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
		...(gamemaker === undefined ? {} : { gamemaker }),
		...(interpreter === undefined ? {} : { interpreter }),
		...(weaver === undefined ? {} : { weaver }),
		arena,
	};
}

/** The highest level every resident still in the city has passed (0 for none). */
function passedByAll(world: World, lastLevel: number): number {
	let level = lastLevel;
	while (level > 0 && !world.alive.every((id) => world.hasPassed(id, level))) level -= 1;
	return level;
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

/** The souffleur with its spend logged as `usage` of {@link SOUFFLEUR_ID}. */
function meteredSouffleur(souffleur: Souffleur, bus: EventBus): Souffleur {
	return {
		label: souffleur.label,
		async rewrite(texts) {
			const answer = await souffleur.rewrite(texts);
			for (const entry of answer.usage) bus.emit({ type: "usage", agent: SOUFFLEUR_ID, ...entry });
			return answer;
		},
	};
}

/** The weaver as a sink of the bus; it asks the model only about residents an event touched. */
function createWeaver(
	options: ComposeOptions,
	world: World,
	bus: EventBus,
	characterOf: (agent: CompetitorId) => string,
	rewrite: (agent: CompetitorId, shift: string) => void,
): Weaver {
	const model = options.weaver;
	if (model === undefined) throw new Error("A run with the weaver needs the weaver option");
	const weaver = new Weaver({
		model: typeof model === "function" ? model(world) : model,
		bus,
		city: world,
		characterOf,
		rewrite,
		actTitle: (fromLevel) => world.story.acts?.find((act) => act.fromLevel === fromLevel)?.title,
	});
	bus.subscribe(weaver);
	return weaver;
}

/** A persona as the weaver reads it, for a resident without a core. */
function personaText(persona: Persona): string {
	return `Temperament: ${persona.temperament}. Values: ${persona.values}. Voice: ${persona.voice}.`;
}

function createInterpreter(options: ComposeOptions, world: World, bus: EventBus, minute: () => number): Interpreter {
	const classifier = options.classifier;
	if (classifier === undefined) throw new Error("A run with a classifier needs the classifier option");
	const interpreter = new Interpreter({
		classifier: typeof classifier === "function" ? classifier(world) : classifier,
		bus,
		competitors: world.competitors,
		minute,
		nameOf: (agent) => world.nameOf(agent),
	});
	bus.subscribe(interpreter);
	return interpreter;
}

function createGamemaker(options: ComposeOptions, world: World, bus: EventBus, agents: number, labels: boolean, direction: DirectionLevel): Gamemaker {
	const story = options.story;
	const spec = story.gamemaker;
	if (spec === undefined) throw new Error(`Story ${story.id} has no gamemaker`);
	const models = options.gamemakerModels;
	if (models === undefined) throw new Error("A run with a gamemaker needs gamemakerModels");
	const source = typeof models === "function" ? models(world) : models;
	const maxOutputTokens = spec.model.maxOutputTokens;
	const limits = options.limits ?? { ...DEFAULT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
	const gamemaker = new Gamemaker({
		spec,
		world,
		bus,
		binding: source.bind(GAMEMAKER_ID, limits),
		systemPrompt: gamemakerSystemPrompt({
			city: story.city,
			agents,
			survivors: story.run.survivors,
			rules: story.rules,
			spec,
			labels,
			...(story.tribunal === undefined || !spec.roles.some((entry) => entry.role === "director") ? {} : { tribunal: { factions: story.tribunal.factions !== undefined } }),
			characters: story.goals !== undefined || world.competitors.some((agent) => world.coreOf(agent) !== undefined),
			seal: world.seal !== undefined,
			direction,
		}),
		thinking: spec.model.thinking ?? "low",
		direction,
	});
	bus.subscribe(gamemaker);
	return gamemaker;
}

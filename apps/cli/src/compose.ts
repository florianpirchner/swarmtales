/**
 * Wires a story into a playable run: clock, event bus, world, director,
 * competitors and scheduler. Used by the CLI and by the tests.
 */
import {
	AgentRunner,
	assignModels,
	assignPersonas,
	baseSystemPrompt,
	type DeliveryJudge,
	Gamemaker,
	GAMEMAKER_ID,
	gamemakerSystemPrompt,
	GUARD_ID,
	type GuardJudge,
	Interpreter,
	JUDGE_ID,
	type PromptFacts,
	type Souffleur,
	SOUFFLEUR_ID,
	type StatementClassifier,
	Weaver,
	type WeaverModel,
} from "@swarmtales/roles";
import { type AgentProfile, Arena, bindStory, briefLine, type Budget, directFigure, directionBlock, type DirectionLevel, Director, EventBus, type FigureCue, FigureCues, figureOf, renderCoreMotive, ToolGuard, World } from "@swarmtales/engine";
import { type CompetitorId, competitorIds, VirtualClock } from "@swarmtales/kernel";
import type { ModelSource, RequestLimits } from "@swarmtales/models";
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION, SnapshotError, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import { assertPlayable, DEFAULT_LIMITS, effectiveRun, type EffectiveRun, type RunOverrides } from "./run-options.ts";
import type { EventSink } from "@swarmtales/legacy-log";
import type { AnyStory, ModelChoice, Persona, ThinkingLevel } from "@swarmtales/contracts";
import { storyId } from "../../../stories/index.ts";

export { DEFAULT_LIMITS, resolveBlockSize, type EffectiveRun, type RunOverrides } from "./run-options.ts";

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
	/** The tool guard's model (SPEC 20); without one a story's guards run only the city's own check. */
	readonly guardJudge?: GuardJudge;
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

/**
 * What the system prompt says about names (v08). It is the same in a resumed
 * run, so the run goes on exactly as before; the resident's own name is in its context.
 */
function namesFact(world: World): Pick<PromptFacts, "names"> {
	const untilMinute = world.namesUntil;
	return untilMinute === undefined ? {} : { names: { untilMinute } };
}

/** The resident's core motive in prose for its system prompt (v09); dealt by the world, kept in its snapshot. */
function coreMotiveFact(world: World, agent: CompetitorId): Pick<PromptFacts, "coreMotive" | "frame"> {
	const spec = world.story.coreMotives;
	const coreMotive = world.coreMotiveOf(agent);
	if (spec === undefined || coreMotive === undefined) return {};
	return { coreMotive: renderCoreMotive(spec, coreMotive), ...(spec.frame === undefined ? {} : { frame: spec.frame }) };
}

/** The figures a run names (`--cast`): the story has a cast with each of them, and there are no more than residents. */
function assertCast(story: AnyStory, effective: EffectiveRun, cast: readonly string[] | undefined): void {
	if (cast === undefined) return;
	const figures = story.coreMotives?.figures ?? [];
	if (!effective.coreMotives || figures.length === 0) throw new SnapshotError(`The story ${story.id} has no cast to play`);
	const unknown = cast.filter((id) => !figures.some((figure) => figure.id === id));
	if (unknown.length > 0) throw new SnapshotError(`Unknown figures ${unknown.join(", ")}; the cast has ${figures.map((figure) => figure.id).join(", ")}`);
	if (cast.length > effective.agents) throw new SnapshotError(`The cast names ${cast.length} figures for ${effective.agents} residents`);
}

/** A cast figure plays the persona of its profession, so its voice and its figure agree. */
function figurePersona(world: World, agent: CompetitorId): Persona | undefined {
	const id = world.coreMotiveOf(agent)?.figure;
	const profession = id === undefined ? undefined : world.story.coreMotives?.figures?.find((figure) => figure.id === id)?.profession;
	return profession === undefined ? undefined : world.story.personas.find((persona) => persona.name.toLowerCase() === profession.toLowerCase());
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
		throw new SnapshotError("The snapshot's residents already have their core motives; --cast applies only to a fresh run");
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
		coreMotives: effective.coreMotives,
		...(options.overrides?.cast === undefined ? {} : { cast: options.overrides.cast }),
		// At gm direction 10 the gamemaker orders scenes, and a resident may refuse one (defy).
		defiance: story.gamemaker !== undefined && effective.gmDirection >= 10,
		whisperer: effective.whisperer,
		// The figure dial steers the whisperer too: at 10 the city measures its orders, and it may refuse the gamemaker's notes.
		whispererDirection: { level: effective.figureDirection, defies: effective.gamemaker && story.gamemaker !== undefined },
		// Only the gamemaker calls a holdout tribunal: without it the tribunal (and its rule in the tasks) is left out.
		holdout: effective.gamemaker,
	});
	const director = new Director(story.director, world, bus);
	if (resume !== undefined) director.restore(resume.snapshot.director);
	const assignments = assignModels(story, ids, effective.seed, options.modelOverride);
	const personas = effective.personas ? assignPersonas(story, ids, effective.seed) : new Map<CompetitorId, never>();
	const source = typeof options.models === "function" ? options.models(world, assignments) : options.models;
	const judge = options.judge === undefined ? undefined : meteredJudge(options.judge, bus);
	const souffleur = options.souffleur === undefined ? undefined : meteredSouffleur(options.souffleur, bus);
	const guard = createGuard(story, effective, world, bus, options.guardJudge);

	const figures = story.coreMotives?.figures;
	// Rivals still in the city; an exiled one is no longer faced.
	const playedBy = (figure: string): CompetitorId | undefined => world.alive.find((agent) => world.coreMotiveOf(agent)?.figure === figure);
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
	// Whispers (`toolScope: "story"`): a resident sees its doors' tools and what the city opened to it at the start; the rest joins when it opens.
	const storyTools = story.toolScope === "story";
	const levelTools = new Set<string>(story.levels.flatMap((entry) => entry.tools));
	const runners = ids.map((id) => {
		const bound = bindStory({ self: id, world, ...(judge === undefined ? {} : { judge }), ...(guard === undefined ? {} : { guard }) }, story);
		const initialTools = storyTools ? bound.filter((tool) => levelTools.has(tool.name) || tool.name === "activeTools" || world.enabledTools(id).some((name) => name === tool.name)) : bound;
		// The whisperer's secret brief closes its own prompt; nobody else reads it.
		const whispers = world.whisperer === id ? story.whisperer : undefined;
		const brief = whispers?.brief.trim();
		const model = assignments.get(id) ?? story.model;
		const figure = figureOf(figures, world.coreMotiveOf(id)?.figure);
		// The whisperer is directed like a cast figure (after P64, P67, P69); its orders follow its secret brief, last in the prompt.
		const direction = figure?.direction ?? whispers?.direction;
		// From figure direction 6 a figure speaks for itself: no persona block beside it.
		const led = (figure !== undefined || whispers?.direction !== undefined) && effective.figureDirection >= 6;
		const directed = directFigure(effective.figureDirection, direction, playedBy);
		// The whisperer obeys the gamemaker's notes whenever one plays; a figure only at gm direction 10.
		const authorOf = whispers === undefined ? author : effective.gamemaker ? story.gamemaker?.author : undefined;
		const block = directed === undefined ? undefined : directionBlock(directed, (text) => world.display(text), authorOf);
		const whispererBlock = whispers === undefined ? undefined : block;
		const coreMotive = coreMotiveFact(world, id);
		if (directed !== undefined && coreMotive.coreMotive !== undefined) {
			const brief = briefLine(directed);
			cues.set(id, { ...(brief === undefined ? {} : { brief }), full: [coreMotive.coreMotive, ...(block === undefined ? [] : [block])].join("\n\n") });
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
					...coreMotive,
					...(led ? { direction: { level: effective.figureDirection, ...(block === undefined || whispererBlock !== undefined ? {} : { block }) } } : {}),
					...(shift === undefined ? {} : { shift }),
					...(storyTools ? { storyTools: true } : {}),
				},
				persona,
			);
			return [
				base,
				...(brief === undefined ? [] : [brief]),
				...(whispererBlock === undefined ? [] : [whispererBlock]),
				...(options.promptAddenda ?? []).filter((entry) => entry.agent === undefined || entry.agent === id).map((entry) => entry.text.trim()),
			].join("\n\n");
		};
		prompts.set(id, promptOf);
		characters.set(id, coreMotive.coreMotive ?? (persona === undefined ? "" : personaText(persona)));
		return new AgentRunner({
			id,
			systemPrompt: promptOf(undefined),
			tools: initialTools,
			...(storyTools ? { lateTool: (name: string) => bound.find((tool) => tool.name === name) } : {}),
			binding: source.bind(id, limits),
			bus,
			thinking: options.thinking ?? model.thinking ?? story.model.thinking ?? "medium",
			enabledTools: () => world.enabledTools(id),
			minute: () => clock.minute,
			...(souffleur === undefined ? {} : { souffleur }),
			...(weaver === undefined ? {} : { innerVoice: { take: () => weaver.takeVoices(id), giveBack: (voices: readonly string[]) => { weaver.returnVoices(id, voices); } } }),
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

	const budgetLimit = options.overrides?.budgetUsd ?? story.run.budgetUsd;
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
		storyId(snapshot.story) === story.id ? undefined : `story "${snapshot.story}" (this run: "${story.id}")`,
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

/**
 * The story's tool guards (SPEC 20), unless the run plays without them; the
 * guard's model spend is logged as `usage` of {@link GUARD_ID}, so budget and
 * usage report count it.
 */
function createGuard(story: AnyStory, effective: EffectiveRun, world: World, bus: EventBus, judge: GuardJudge | undefined): ToolGuard | undefined {
	const spec = story.guards;
	if (spec === undefined || !effective.guards) return undefined;
	const metered: GuardJudge | undefined =
		judge === undefined
			? undefined
			: {
					label: judge.label,
					async judge(question) {
						const answer = await judge.judge(question);
						for (const entry of answer.usage) bus.emit({ type: "usage", agent: GUARD_ID, ...entry });
						return answer;
					},
				};
	return new ToolGuard({
		spec,
		...(metered === undefined ? {} : { judge: metered }),
		secretsOf: (agent, minRun) => world.secretsOf(agent, minRun),
		emit: (event) => {
			bus.emit(event);
		},
	});
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

/** A persona as the weaver reads it, for a resident without a core motive. */
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
			characters: story.goals !== undefined || world.competitors.some((agent) => world.coreMotiveOf(agent) !== undefined),
			seal: world.seal !== undefined,
			direction,
			...(story.holdout === undefined ? {} : { holdout: story.holdout }),
			...(world.whisperer === undefined ? {} : { whisperer: true }),
			...(world.whisperQuota === undefined ? {} : { whispererDuty: true }),
		}),
		thinking: spec.model.thinking ?? "low",
		direction,
	});
	bus.subscribe(gamemaker);
	return gamemaker;
}

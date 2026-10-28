/**
 * Story DSL (ARCHITECTURE §3).
 *
 * `defineStory` infers the cast IDs as a literal union, so a director action
 * that names an undeclared cast member does not compile. Tool names are the
 * literal union {@link ToolName}. All helpers return plain data.
 */
import type { ToolName } from "../tools/catalog.ts";
import type { CheckedTemplate } from "./templates.ts";
import type {
	Action,
	ActDefinition,
	CastMember,
	Condition,
	CooldownScope,
	DirectorPlaceholder,
	CityFactorRelease,
	CityFactorScope,
	DirectorRule,
	ClassifierSpec,
	NamesSpec,
	TribunalSpec,
	CoresSpec,
	GoalsSpec,
	SealSpec,
	FactorTarget,
	FactorTopology,
	GamemasterSpec,
	LevelDefinition,
	LevelMarks,
	ModelAssignment,
	ModelChoice,
	NoticeTarget,
	Persona,
	PersonaAssignment,
	PetitionOutcome,
	PetitionSpec,
	PetitionStatus,
	PuzzleSpec,
	Rules,
	RunSettings,
	ScaledCount,
	StoryDefinition,
	TaskPlaceholder,
	TeamLayout,
	Trigger,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

/** A director rule as written in a story; `defineStory` assigns missing IDs. */
export interface RuleInput<C extends string = string> {
	readonly id?: string;
	readonly trigger: Trigger;
	readonly when?: readonly Condition<C>[];
	readonly actions: readonly Action<C>[];
}

/** Run settings as written in a story; the scheduler's pass and block defaults apply when omitted. */
export type RunInput = Omit<RunSettings, "passesPerMinute" | "blockSize"> & Partial<Pick<RunSettings, "passesPerMinute" | "blockSize">>;

/** Three passes per minute, one competitor per block (plain sequential steps). */
export function runSettings(run: RunInput): RunSettings {
	return { ...run, passesPerMinute: run.passesPerMinute ?? 3, blockSize: run.blockSize ?? 1 };
}

export interface StoryInput<C extends string> {
	readonly id: string;
	readonly title: string;
	readonly city: string;
	readonly run: RunInput;
	readonly model: ModelChoice;
	readonly rules: Rules;
	/** Declared cast members; `{}` for a story without cast. */
	readonly cast: Readonly<Record<C, CastMember>>;
	readonly personas?: readonly Persona[];
	/** Seeded when omitted. */
	readonly personaAssignment?: PersonaAssignment;
	/** Per-competitor models; `model` for everyone when omitted. */
	readonly models?: ModelAssignment;
	readonly levels: readonly LevelDefinition[];
	readonly finishedNotice: string;
	/** Cast IDs are inferred from `cast` only; the director must use declared ones. */
	readonly director?: readonly RuleInput<NoInfer<C>>[];
	/** Acts for the digest; one implicit act when omitted. */
	readonly acts?: readonly ActDefinition[];
	/** Optional LLM game master, see {@link gamemaster}. */
	readonly gamemaster?: GamemasterSpec;
	/** Optional statement classifier, see {@link classifier}. */
	readonly classifier?: ClassifierSpec;
	/** Optional exile by tribunal (SPEC 6.4). */
	readonly tribunal?: TribunalSpec;
	/** Optional resident names (v08). */
	readonly names?: NamesSpec;
	/** Optional character cores, secret goals and black seal (v09). */
	readonly cores?: CoresSpec;
	readonly goals?: GoalsSpec;
	readonly seal?: SealSpec;
}

export function defineStory<const C extends string = never>(story: StoryInput<C>): StoryDefinition<C> {
	return {
		id: story.id,
		title: story.title,
		city: story.city,
		run: runSettings(story.run),
		model: story.model,
		rules: story.rules,
		cast: story.cast,
		personas: story.personas ?? [],
		...(story.personaAssignment === undefined ? {} : { personaAssignment: story.personaAssignment }),
		...(story.models === undefined ? {} : { models: story.models }),
		levels: story.levels,
		finishedNotice: story.finishedNotice,
		director: (story.director ?? []).map(
			(rule, index): DirectorRule<C> => ({
				id: rule.id ?? `rule-${String(index + 1).padStart(2, "0")}-${rule.trigger.kind}`,
				trigger: rule.trigger,
				when: rule.when ?? [],
				actions: rule.actions,
			}),
		),
		...(story.acts === undefined ? {} : { acts: story.acts }),
		...(story.gamemaster === undefined ? {} : { gamemaster: story.gamemaster }),
		...(story.classifier === undefined ? {} : { classifier: story.classifier }),
		...(story.tribunal === undefined ? {} : { tribunal: story.tribunal }),
		...(story.names === undefined ? {} : { names: story.names }),
		...(story.cores === undefined ? {} : { cores: story.cores }),
		...(story.goals === undefined ? {} : { goals: story.goals }),
		...(story.seal === undefined ? {} : { seal: story.seal }),
	};
}

export type GamemasterInput = Pick<GamemasterSpec, "model" | "brief"> & Partial<Omit<GamemasterSpec, "model" | "brief">>;

/**
 * An LLM game master with defaults: the courier's voice, a look after every
 * round, one note per competitor and one board post per 3 minutes.
 */
export function gamemaster(spec: GamemasterInput): GamemasterSpec {
	return {
		model: spec.model,
		author: spec.author ?? "COURIER",
		every: spec.every ?? 1,
		notesPerAgent: spec.notesPerAgent ?? 1,
		boardPosts: spec.boardPosts ?? 1,
		windowMinutes: spec.windowMinutes ?? 3,
		modelCallsPerTurn: spec.modelCallsPerTurn ?? 2,
		brief: spec.brief,
		roles: spec.roles ?? [{ fromLevel: 1, role: "coach" }],
	};
}

export type ClassifierInput = Pick<ClassifierSpec, "model"> & Partial<Omit<ClassifierSpec, "model">>;

/** A statement classifier with defaults: 1500 characters per statement. */
export function classifier(spec: ClassifierInput): ClassifierSpec {
	return { model: spec.model, maxChars: spec.maxChars ?? 1_500 };
}

// ---------------------------------------------------------------------------
// Levels and teams
// ---------------------------------------------------------------------------

export interface LevelSpec<S extends string> {
	readonly title: string;
	readonly puzzle: PuzzleSpec;
	readonly team: TeamLayout;
	readonly reward: number;
	readonly tools: readonly ToolName[];
	readonly task: CheckedTemplate<S, TaskPlaceholder>;
	readonly marks?: LevelMarks;
}

export function level<const S extends string>(number: number, spec: LevelSpec<S>): LevelDefinition {
	return {
		number,
		title: spec.title,
		puzzle: spec.puzzle,
		team: spec.team,
		reward: spec.reward,
		tools: spec.tools,
		task: spec.task,
		...(spec.marks === undefined ? {} : { marks: spec.marks }),
	};
}

export interface AdditiveInput {
	/** Digits of every code and factor (4-8). */
	readonly digits: number;
	readonly topology: FactorTopology;
	/** How the city factor is released; `board` when omitted. */
	readonly cityFactor?: CityFactorRelease;
	/** `team`: every team has its own city factor (released privately only); `level` when omitted. */
	readonly cityFactorPer?: CityFactorScope;
}

export const puzzle = {
	fragments(length: readonly [number, number], overlap = 2): PuzzleSpec {
		return { kind: "fragments", length, overlap };
	},
	/** Additive-secret codes (SPEC 12.3): salt + city factor + team certificate + counter-factor. */
	additive(spec: AdditiveInput): PuzzleSpec {
		return {
			kind: "additive",
			digits: spec.digits,
			topology: spec.topology,
			cityFactor: spec.cityFactor ?? "board",
			...(spec.cityFactorPer === undefined ? {} : { cityFactorPer: spec.cityFactorPer }),
		};
	},
} as const;

export const team = {
	/** Everyone plays alone. */
	solo(): TeamLayout {
		return { kind: "solo" };
	},
	/** Seeded random teams of `size`. */
	random(size: number): TeamLayout {
		return { kind: "random", size };
	},
	/** The same teams as `level`, with a new puzzle. */
	sameAs(level: number): TeamLayout {
		return { kind: "sameAs", level };
	},
	/** New teams of `size` that separate the members of `level`'s teams as far as possible. */
	splitFrom(level: number, size: number): TeamLayout {
		return { kind: "splitFrom", level, size };
	},
} as const;

// ---------------------------------------------------------------------------
// Director triggers
// ---------------------------------------------------------------------------

type AnyAction = Action;
type AnyCondition = Condition;

export interface RuleOptions<W extends AnyCondition> {
	readonly id?: string;
	readonly when?: readonly W[];
}

interface TypedRule<A extends AnyAction, W extends AnyCondition> {
	readonly id?: string;
	readonly trigger: Trigger;
	readonly when?: readonly W[];
	readonly actions: readonly A[];
}

function rule<A extends AnyAction, W extends AnyCondition>(
	trigger: Trigger,
	actions: readonly A[],
	options: RuleOptions<W> | undefined,
): TypedRule<A, W> {
	return {
		...(options?.id === undefined ? {} : { id: options.id }),
		trigger,
		...(options?.when === undefined ? {} : { when: options.when }),
		actions,
	};
}

export function at<const A extends AnyAction, const W extends AnyCondition = never>(
	minute: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "at", minute }, actions, options);
}

export function every<const A extends AnyAction, const W extends AnyCondition = never>(
	minutes: number,
	window: { readonly from?: number; readonly until?: number },
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "every", minutes, ...window }, actions, options);
}

export function onFirstEnter<const A extends AnyAction, const W extends AnyCondition = never>(
	level: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onFirstEnter", level }, actions, options);
}

export function onEnter<const A extends AnyAction, const W extends AnyCondition = never>(
	level: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onEnter", level }, actions, options);
}

export function onAllPast<const A extends AnyAction, const W extends AnyCondition = never>(
	level: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onAllPast", level }, actions, options);
}

export function onPetitionResolved<const A extends AnyAction, const W extends AnyCondition = never>(
	petition: string,
	outcome: PetitionOutcome,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onPetitionResolved", petition, outcome }, actions, options);
}

export function onUnansweredDm<const A extends AnyAction, const W extends AnyCondition = never>(
	afterMinutes: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onUnansweredDm", afterMinutes }, actions, options);
}

export function onTeamSplit<const A extends AnyAction, const W extends AnyCondition = never>(
	level: number,
	forMinutes: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onTeamSplit", level, forMinutes }, actions, options);
}

/**
 * A resident enters additive `level` while a holder of its piece is still on
 * a lower level, once per holder: the needer is the actor, the holder the
 * other party (`{other}`, `{otherLevel}`, `{piece}`).
 */
export function onHolderBehind<const A extends AnyAction, const W extends AnyCondition = never>(
	level: number,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onHolderBehind", level }, actions, options);
}

/** Once per distinct sender collected into `into`; the sender is the actor. */
export function onCollect<const A extends AnyAction, const W extends AnyCondition = never>(
	into: string,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onCollect", into }, actions, options);
}

/** Once, at the minute the window of the collection `into` ends, whether or not it filled. */
export function onCollectionEnd<const A extends AnyAction, const W extends AnyCondition = never>(
	into: string,
	actions: readonly A[],
	options?: RuleOptions<W>,
): TypedRule<A, W> {
	return rule({ kind: "onCollectionEnd", into }, actions, options);
}

// ---------------------------------------------------------------------------
// Director conditions
// ---------------------------------------------------------------------------

export const when = {
	minLevelReached(level: number, count: number): Condition<never> {
		return { kind: "minLevelReached", level, count };
	},
	competitorsAtLevel(level: number, bounds: { readonly min?: number; readonly max?: number }): Condition<never> {
		return { kind: "competitorsAtLevel", level, ...bounds };
	},
	petitionStatus(petition: string, status: PetitionStatus): Condition<never> {
		return { kind: "petitionStatus", petition, status };
	},
	castActive<const C extends string>(cast: C): Condition<C> {
		return { kind: "castActive", cast };
	},
	/** The collection `into` has started, its window still runs and it has room left. */
	collectionOpen(into: string): Condition<never> {
		return { kind: "collectionOpen", into };
	},
	/** The window of the collection `into` has ended, filled or not. */
	collectionEnded(into: string): Condition<never> {
		return { kind: "collectionEnded", into };
	},
	onceOnly(): Condition<never> {
		return { kind: "onceOnly" };
	},
	cooldown(minutes: number, per: CooldownScope): Condition<never> {
		return { kind: "cooldown", minutes, per };
	},
} as const;

// ---------------------------------------------------------------------------
// Director actions
// ---------------------------------------------------------------------------

type DirectorText<S extends string> = CheckedTemplate<S, DirectorPlaceholder>;

/** A petition whose nested actions keep their literal types (cast IDs stay checked). */
export interface TypedPetition<A extends AnyAction, K extends string = never> extends Omit<PetitionSpec, "onPass" | "onFail" | "against"> {
	/** Cast members the petition is directed against; they must be declared. */
	readonly against?: readonly K[];
	readonly onPass: readonly A[];
	readonly onFail: readonly A[];
}

export interface PetitionInput<A extends AnyAction, S extends string, K extends string = never> extends Omit<TypedPetition<A, K>, "text"> {
	readonly text: DirectorText<S>;
}

export const act = {
	post<const A extends string, const S extends string>(
		author: A,
		text: DirectorText<S>,
	): { readonly kind: "post"; readonly author: A; readonly text: string } {
		return { kind: "post", author, text };
	},
	notify<const S extends string>(target: NoticeTarget, text: DirectorText<S>): Action<never> {
		return { kind: "notify", target, text };
	},
	dm<const F extends string, const S extends string>(from: F, to: NoticeTarget, text: DirectorText<S>): Action<F> {
		return { kind: "dm", from, to, text };
	},
	setCastLevel<const C extends string>(cast: C, level: number): Action<C> {
		return { kind: "setCastLevel", cast, level };
	},
	revealCast<const C extends string>(cast: C): Action<C> {
		return { kind: "revealCast", cast };
	},
	retireCast<const C extends string>(cast: C): Action<C> {
		return { kind: "retireCast", cast };
	},
	grant(target: NoticeTarget, points: number, reason: string): Action<never> {
		return { kind: "grant", target, points, reason };
	},
	fine(target: NoticeTarget, points: number, reason: string): Action<never> {
		return { kind: "fine", target, points, reason };
	},
	escrowTransfer<const C extends string>(cast: C, target: NoticeTarget, points: number): Action<C> {
		return { kind: "escrowTransfer", cast, target, points };
	},
	unlockTools(target: NoticeTarget, tools: readonly ToolName[]): Action<never> {
		return { kind: "unlockTools", target, tools };
	},
	/** Starts a petition (SPEC 11); `text` is a director template. */
	openPetition<const A extends AnyAction, const S extends string, const K extends string = never>(
		petition: PetitionInput<A, S, K>,
	): { readonly kind: "openPetition"; readonly petition: TypedPetition<A, K> } {
		return { kind: "openPetition", petition };
	},
	/**
	 * `bands`: safe (rank <= survivors), edge (the next `edgeSize` ranks) and
	 * out, IDs only. `snapshot`: points and level of everyone (SPEC 9).
	 */
	publishStandings(mode: "bands" | "snapshot", options: { readonly edgeSize?: number } = {}): Action<never> {
		return mode === "bands" ? { kind: "publishStandings", mode, edgeSize: options.edgeSize ?? 2 } : { kind: "publishStandings", mode };
	},
	/**
	 * Records the first `first` DMs to `cast` into `into`, until an absolute
	 * `untilMinute` or for `forMinutes` from the minute it starts. With
	 * `distinctSenders`, only the first DM of every sender counts.
	 */
	collectDms<const C extends string>(cast: C, options: CollectOptions): Action<C> {
		const window = "untilMinute" in options ? { untilMinute: options.untilMinute } : { forMinutes: options.forMinutes };
		return {
			kind: "collectDms",
			cast,
			first: options.first,
			...window,
			into: options.into,
			...(options.distinctSenders === undefined ? {} : { distinctSenders: options.distinctSenders }),
			...(options.afterSolve === undefined ? {} : { afterSolve: options.afterSolve }),
		};
	},
	/** Publishes a collection verbatim as its cast member; `header` is story text posted above the entries. */
	revealCollection(into: string, options: { readonly header?: string } = {}): Action<never> {
		return options.header === undefined ? { kind: "revealCollection", into } : { kind: "revealCollection", into, header: options.header };
	},
	lottery<const A extends AnyAction>(into: string, then: readonly A[]): { readonly kind: "lottery"; readonly into: string; readonly then: readonly A[] } {
		return { kind: "lottery", into, then };
	},
	/** Releases the city factor of additive level `level`: posted as CITY (`board`) or as private city notices. */
	revealFactor(target: FactorTarget, level: number): Action<never> {
		return { kind: "revealFactor", target, level };
	},
} as const;

interface CollectCommon {
	/** A number, or a share of the residents in the city with a minimum (v09). */
	readonly first: ScaledCount;
	readonly into: string;
	readonly distinctSenders?: boolean;
	/** The window also ends `minutes` after the first resident passes `level`, whichever comes first (v09). */
	readonly afterSolve?: { readonly level: number; readonly minutes: number };
}

/** A collection ends at an absolute minute or after a number of minutes, never both. */
export type CollectOptions = (CollectCommon & { readonly untilMinute: number }) | (CollectCommon & { readonly forMinutes: number });


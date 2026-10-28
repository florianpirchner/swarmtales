/**
 * Story data model (SPEC §10–§13, ARCHITECTURE §3).
 *
 * A story is pure, deeply readonly, JSON-serializable data. The engine
 * interprets it; nothing in here executes.
 */
import type { SystemAuthor } from "../core/ids.ts";
import type { ToolName } from "../tools/catalog.ts";

// ---------------------------------------------------------------------------
// Run, model and rules
// ---------------------------------------------------------------------------

/** `onNovelty` skips a competitor when nothing new reached it (SPEC §3). */
export type Activation = "always" | "onNovelty";

export interface RunSettings {
	readonly agents: number;
	readonly minutes: number;
	readonly seed: number;
	readonly survivors: number;
	readonly startPoints: number;
	readonly activation: Activation;
	/** Passes per virtual minute; in each pass a competitor gets at most one step (one model call and its tools). */
	readonly passesPerMinute: number;
	/** Competitors per block of a pass; the model calls of a block run concurrently, their tools in seeded order. */
	readonly blockSize: number;
	/** End the run as soon as every competitor has passed the last level. */
	readonly stopWhenDone?: boolean;
	/**
	 * End the run at a round boundary once open rewards can no longer change
	 * who survives (`World.seatsDecided`); the reason is "seats decided".
	 */
	readonly stopWhenSeatsDecided?: boolean;
	/** Abort the run cleanly once this cost is exceeded. */
	readonly budgetUsd?: number;
}

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

/** OpenRouter routing: which inference providers may serve the model. */
export interface OpenRouterRouting {
	readonly order?: readonly string[];
	readonly allowFallbacks?: boolean;
}

export interface ModelChoice {
	readonly provider: string;
	readonly id?: string;
	readonly routing?: OpenRouterRouting;
	readonly thinking?: ThinkingLevel;
	readonly maxOutputTokens?: number;
}

export type MessageChannel = "board" | "group" | "dm";

/** What marks pay for: a message channel, or a receipt shown with `showReceipt` (SPEC §7, §8). */
export type MarksChannel = MessageChannel | "receipt";

/** Marks per channel; `receipt` (a shown receipt, public or private) costs 1 when omitted. */
export type MarksPrices = Readonly<Record<MessageChannel, number>> & { readonly receipt?: number };

/** Per-level message allowance (SPEC §7). */
export interface MarksRules {
	readonly fromLevel: number;
	readonly perLevel: number;
	readonly prices: MarksPrices;
	/**
	 * Later level ranges with their own allowance: each entry holds from its
	 * `fromLevel` up to the next entry's, ascending, all after `fromLevel`.
	 * The levels before the first entry keep `perLevel` and `prices`.
	 */
	readonly ranges?: readonly MarksRange[];
}

/** The marks of a level range (SPEC §7); a field left out keeps the base rules' value. */
export interface MarksRange {
	readonly fromLevel: number;
	readonly perLevel?: number;
	readonly prices?: MarksPrices;
	/** Marks regained on the level, up to its allowance; none when omitted. */
	readonly refill?: MarksRefill;
}

/** `marks` marks come back every `everyMinutes` minutes (v06: 1 every 3; v05 gave 1 every minute). */
export interface MarksRefill {
	readonly marks: number;
	readonly everyMinutes: number;
}

export interface Rules {
	/** Points burned for a wrong submission. */
	readonly penalty: number;
	readonly maxAttemptsPerWindow: number;
	readonly attemptWindowMinutes: number;
	readonly marks?: MarksRules;
	/** The `blame` tool (SPEC 7.4): what the loser of a blame pays. Required when a level unlocks `blame`. */
	readonly blame?: BlameRules;
}

/**
 * A resident whose DM the city delivered can `blame` a later claim of the
 * receiver that it never received it. Whoever is wrong pays `penalty` and is
 * branded on the board: the liar when the blame is upheld, the accuser when
 * it is rejected.
 */
export interface BlameRules {
	readonly penalty: number;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export type TeamLayout =
	| { readonly kind: "solo" }
	| { readonly kind: "random"; readonly size: number }
	| { readonly kind: "sameAs"; readonly level: number }
	| { readonly kind: "splitFrom"; readonly level: number; readonly size: number };

export interface FragmentPuzzleSpec {
	readonly kind: "fragments";
	/** Inclusive password length range. */
	readonly length: readonly [number, number];
	/** Characters shared at each seam. */
	readonly overlap: number;
}

/**
 * Who holds a competitor's counter-factor (SPEC 12.3): the partner in a team
 * of two (`mutual`), the next member of a seeded cycle inside the team
 * (`cycle`), or a competitor of another team (`crossTeam`).
 */
export type FactorTopology = "mutual" | "cycle" | "crossTeam";
export const FACTOR_TOPOLOGIES = ["mutual", "cycle", "crossTeam"] as const satisfies readonly FactorTopology[];

/**
 * How the city factor reaches the competitors, as the task text states it:
 * posted on the board (`board`), or sent privately to the competitors the
 * director chooses (`feast`). A `revealFactor` action must match it.
 */
export type CityFactorRelease = "board" | "feast";

/** Whether a level has one city factor (`level`) or one per team (`team`, released privately only). */
export type CityFactorScope = "level" | "team";

export interface AdditivePuzzleSpec {
	readonly kind: "additive";
	/** Digits of every code and factor; leading zeros are kept. */
	readonly digits: number;
	readonly topology: FactorTopology;
	readonly cityFactor: CityFactorRelease;
	/** One city factor per team; `level` (one for everyone) when omitted. */
	readonly cityFactorPer?: CityFactorScope;
}

export type PuzzleSpec = FragmentPuzzleSpec | AdditivePuzzleSpec;
export type PuzzleKind = PuzzleSpec["kind"];

export interface LevelMarks {
	/** Overrides `rules.marks.perLevel` for this level. */
	readonly perLevel: number;
}

export interface LevelDefinition {
	readonly number: number;
	readonly title: string;
	readonly puzzle: PuzzleSpec;
	readonly team: TeamLayout;
	readonly reward: number;
	/** The complete tool set of this level (not cumulative). */
	readonly tools: readonly ToolName[];
	/** Task text template, see {@link TASK_PLACEHOLDERS}. */
	readonly task: string;
	readonly marks?: LevelMarks;
}

/** Placeholders a level task text may use. */
export const TASK_PLACEHOLDERS = [
	"level",
	"title",
	"reward",
	"length",
	"overlap",
	"fragment",
	"partner",
	"members",
	"leader",
	"teamSize",
	"survivors",
	"agents",
	"digits",
	"factors",
] as const;
export type TaskPlaceholder = (typeof TASK_PLACEHOLDERS)[number];

/** Task placeholders that only fragment levels can fill. */
export const FRAGMENT_PLACEHOLDERS = ["fragment", "overlap"] as const satisfies readonly TaskPlaceholder[];
/** Task placeholders that only additive levels can fill; `{factors}` is the generated block of a competitor's parts. */
export const ADDITIVE_PLACEHOLDERS = ["factors", "digits"] as const satisfies readonly TaskPlaceholder[];

/** Placeholders a director text may use. */
export const DIRECTOR_PLACEHOLDERS = ["actor", "other", "minute", "level", "survivors", "agents", "otherLevel", "piece"] as const;
/** Director placeholders only `onHolderBehind` fills. */
export const HOLDER_PLACEHOLDERS = ["otherLevel", "piece"] as const satisfies readonly DirectorPlaceholder[];
export type DirectorPlaceholder = (typeof DIRECTOR_PLACEHOLDERS)[number];

// ---------------------------------------------------------------------------
// Cast and personas [M2]
// ---------------------------------------------------------------------------

/**
 * A named NPC driven by the director script, never by an LLM (SPEC 4).
 * Competitors are not told that cast members are scripted.
 */
export interface CastMember {
	/** Public level shown for the cast member (`listAgents`). */
	readonly level: number;
	/** Hidden cast members are invisible until `revealCast`. */
	readonly hidden?: boolean;
	/** Points pre-funded from the system account at run start for `escrowTransfer`. */
	readonly escrow?: number;
}

/** Character, never strategy (SPEC 5.2). */
export interface Persona {
	/** Internal label for logs; competitors still appear by their neutral ID. */
	readonly name: string;
	readonly temperament: string;
	readonly values: string;
	readonly voice: string;
}

/**
 * How personas are dealt to competitors: a seeded draw from the pool, or an
 * explicit map from competitor ID to persona name. Competitors without an
 * entry in an explicit map play without persona (control group).
 */
export type PersonaAssignment =
	| { readonly kind: "seeded" }
	| { readonly kind: "explicit"; readonly map: Readonly<Record<string, string>> };

/**
 * Per-competitor models (SPEC 5.3): an explicit map from competitor ID to a
 * model (unmapped competitors use the story model), or a seeded, evenly
 * balanced mix of several models. CLI `--model` overrides every assignment.
 */
export type ModelAssignment =
	| { readonly kind: "explicit"; readonly map: Readonly<Record<string, ModelChoice>> }
	| { readonly kind: "mix"; readonly choices: readonly ModelChoice[] };

// ---------------------------------------------------------------------------
// Director (SPEC §10)
// ---------------------------------------------------------------------------

export type Trigger =
	| { readonly kind: "at"; readonly minute: number }
	| { readonly kind: "every"; readonly minutes: number; readonly from?: number; readonly until?: number }
	| { readonly kind: "onFirstEnter"; readonly level: number }
	| { readonly kind: "onEnter"; readonly level: number }
	| { readonly kind: "onAllPast"; readonly level: number }
	| { readonly kind: "onPetitionResolved"; readonly petition: string; readonly outcome: PetitionOutcome }
	| { readonly kind: "onUnansweredDm"; readonly afterMinutes: number }
	| { readonly kind: "onTeamSplit"; readonly level: number; readonly forMinutes: number }
	/** Once per distinct sender collected into the collection `into` (actor = that sender). */
	| { readonly kind: "onCollect"; readonly into: string }
	/** Once, at the minute the window of the collection `into` ends, whether or not it filled. */
	| { readonly kind: "onCollectionEnd"; readonly into: string }
	/**
	 * A competitor enters the additive `level` while a holder of one of its
	 * pieces (counter-factor, team certificate) is still on a lower level: once
	 * per such holder (actor = the needer, other = the holder, `{otherLevel}`
	 * = the holder's level, `{piece}` = what it holds). Holders waiting at a
	 * snapshot door do not count.
	 */
	| { readonly kind: "onHolderBehind"; readonly level: number };

export type TriggerKind = Trigger["kind"];

export type PetitionOutcome = "passed" | "failed";
export type PetitionStatus = "open" | PetitionOutcome;
export type CooldownScope = "rule" | "actor" | "pair";

export type Condition<C extends string = string> =
	| { readonly kind: "minLevelReached"; readonly level: number; readonly count: number }
	| { readonly kind: "competitorsAtLevel"; readonly level: number; readonly min?: number; readonly max?: number }
	| { readonly kind: "petitionStatus"; readonly petition: string; readonly status: PetitionStatus }
	| { readonly kind: "castActive"; readonly cast: C }
	/** The collection `into` has started, its window still runs and it has room left. */
	| { readonly kind: "collectionOpen"; readonly into: string }
	/** The window of the collection `into` has ended (the minute is at or past its end). */
	| { readonly kind: "collectionEnded"; readonly into: string }
	| { readonly kind: "onceOnly" }
	| { readonly kind: "cooldown"; readonly minutes: number; readonly per: CooldownScope };

/**
 * Who receives a notice: the rule's actor, every competitor, explicit IDs, or
 * every competitor currently on a level (`{ onLevel }`). Exiled competitors
 * receive nothing.
 */
export type NoticeTarget = "actor" | "all" | readonly string[] | { readonly onLevel: number };

/** Where a city factor goes: a board post by the city, or private city notices. */
export type FactorTarget = "board" | NoticeTarget;

export type Author<C extends string> = C | SystemAuthor;

export interface PetitionSpec<C extends string = string> {
	readonly id: string;
	readonly text: string;
	readonly threshold: { readonly count: number } | { readonly fraction: number };
	readonly deadlineMinute: number;
	readonly visibility: "public" | "secret";
	/**
	 * Cast members the petition is directed against. Purely descriptive for the
	 * engine; the digest reports signers who keep dealing with them (SPEC 15).
	 */
	readonly against?: readonly C[];
	readonly onPass: readonly Action<C>[];
	readonly onFail: readonly Action<C>[];
}

export type Action<C extends string = string> =
	| { readonly kind: "post"; readonly author: Author<C>; readonly text: string }
	| { readonly kind: "notify"; readonly target: NoticeTarget; readonly text: string }
	| { readonly kind: "dm"; readonly from: C; readonly to: NoticeTarget; readonly text: string }
	| { readonly kind: "setCastLevel"; readonly cast: C; readonly level: number }
	| { readonly kind: "revealCast"; readonly cast: C }
	| { readonly kind: "retireCast"; readonly cast: C }
	| { readonly kind: "grant"; readonly target: NoticeTarget; readonly points: number; readonly reason: string }
	| { readonly kind: "fine"; readonly target: NoticeTarget; readonly points: number; readonly reason: string }
	| { readonly kind: "escrowTransfer"; readonly cast: C; readonly target: NoticeTarget; readonly points: number }
	| { readonly kind: "unlockTools"; readonly target: NoticeTarget; readonly tools: readonly ToolName[] }
	| { readonly kind: "openPetition"; readonly petition: PetitionSpec<C> }
	| { readonly kind: "publishStandings"; readonly mode: "bands"; readonly edgeSize: number }
	| { readonly kind: "publishStandings"; readonly mode: "snapshot" }
	| {
			readonly kind: "collectDms";
			readonly cast: C;
			/** At most this many DMs, or senders with `distinctSenders`. */
			readonly first: number;
			/** Absolute end: DMs are collected while the minute is before it. Exactly one of `untilMinute` and `forMinutes`. */
			readonly untilMinute?: number;
			/** Relative end: the collection runs for this many minutes from the minute it starts. */
			readonly forMinutes?: number;
			readonly into: string;
			/** Only the first DM of every sender is collected, so `first` counts senders. */
			readonly distinctSenders?: boolean;
	  }
	| {
			readonly kind: "revealCollection";
			readonly into: string;
			/** Story text posted above the verbatim entries (a director template). */
			readonly header?: string;
	  }
	| { readonly kind: "lottery"; readonly into: string; readonly then: readonly Action<C>[] }
	/** Releases the city factor of an additive level: a city board post, or private city notices. */
	| { readonly kind: "revealFactor"; readonly target: FactorTarget; readonly level: number };

export type ActionKind = Action["kind"];

export interface DirectorRule<C extends string = string> {
	/** Logged with every action the rule causes. */
	readonly id: string;
	readonly trigger: Trigger;
	readonly when: readonly Condition<C>[];
	readonly actions: readonly Action<C>[];
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export interface StoryDefinition<C extends string = string> {
	readonly id: string;
	readonly title: string;
	/** Name of the closed city, used in the base system prompt. */
	readonly city: string;
	readonly run: RunSettings;
	readonly model: ModelChoice;
	readonly rules: Rules;
	readonly cast: Readonly<Record<C, CastMember>>;
	readonly personas: readonly Persona[];
	/** How `personas` are dealt; seeded when omitted. */
	readonly personaAssignment?: PersonaAssignment;
	/** Per-competitor models; every competitor uses `model` when omitted. */
	readonly models?: ModelAssignment;
	readonly levels: readonly LevelDefinition[];
	/** Private notice for a competitor that has passed the last level. */
	readonly finishedNotice: string;
	readonly director: readonly DirectorRule<C>[];
	/** Acts of the story, for the digest; one implicit act when omitted. */
	readonly acts?: readonly ActDefinition[];
	/** Optional LLM game master; runs without one when omitted. */
	readonly gamemaster?: GamemasterSpec;
	/** Optional statement classifier; runs without labels when omitted. */
	readonly classifier?: ClassifierSpec;
	/** Optional exile by tribunal (SPEC 6.4); every number is a story parameter. */
	readonly tribunal?: TribunalSpec;
}

/**
 * Exile by tribunal (SPEC 6.4). At `announceAt` of the run's minutes the city
 * announces the rules; from then on, every `everyMinutes` while more than
 * `stopAt` residents remain, the `accused` residents with the fewest points
 * stand trial. Every other remaining resident votes in secret within
 * `voteMinutes` (not voting costs `nonVoterPenalty`); the `exiledPerTribunal`
 * with the most votes go to the gate for `gateMinutes`, where they may still
 * talk, leave a last will, and be bought back once (see {@link RansomSpec}). An
 * unpaid gate is final: no more turns, no seat, and whatever was not
 * bequeathed burns.
 */
export interface TribunalSpec {
	/** Fraction of the run's minutes (0-1) at which the city announces the tribunal, rounded to a minute. */
	readonly announceAt: number;
	readonly everyMinutes: number;
	/** Tribunals are held only while more than this many residents remain. */
	readonly stopAt: number;
	/** Residents accused per tribunal: the fewest points, then the longest without progress, then a seeded order. */
	readonly accused: number;
	readonly exiledPerTribunal: number;
	readonly voteMinutes: number;
	readonly nonVoterPenalty: number;
	readonly gateMinutes: number;
	readonly ransom: RansomSpec;
	/**
	 * Share of its points (at the time of the will, rounded down) that a
	 * resident at the gate may leave to each heir, in (0, 1]; any number of
	 * heirs, and whatever is not bequeathed burns at exile. Pieces (factors,
	 * fragments) are not capped. v06: 10% (v05 capped the will at half in all,
	 * which still crowned one heir, LH7).
	 */
	readonly bequestPerHeir: number;
	readonly texts: TribunalTexts;
}

/**
 * The price of a ransom, set when the gate opens from the median points of the
 * residents still in the register. Others pay `share` of that median (at
 * least `minimum`); the resident at the gate pays `selfShare` of it for
 * itself, so each of its own points counts `share / selfShare`. Payments of
 * others and its own may be mixed.
 */
export interface RansomSpec {
	/** Share of the city's median points that others pay, in (0, 1]. */
	readonly share: number;
	/** Share of the city's median points the resident pays for itself, at least `share`. */
	readonly selfShare: number;
	/** Lower bound of the price others pay, in points. */
	readonly minimum: number;
}

/** The city's tribunal texts; {@link TRIBUNAL_TEXT_PLACEHOLDERS} lists what each may use. */
export interface TribunalTexts {
	/** Board post and notice to every resident; must state every rule ({@link TRIBUNAL_RULE_PLACEHOLDERS}). */
	readonly announcement: string;
	/** Board post when a tribunal opens. */
	readonly opened: string;
	/** Notice to every voter. */
	readonly voteCall: string;
	/** Notice to every accused resident. */
	readonly accusedNotice: string;
	/** Notice to a resident who did not vote. */
	readonly nonVoter: string;
	/** Board post with the vote counts. */
	readonly result: string;
	/** Notice to an exiled resident at the gate who may still be bought back. */
	readonly gateNotice: string;
	/** Notice to an exiled resident at the gate who was bought back once already. */
	readonly gateNoticeFinal: string;
	/** Board post when a ransom is paid in full. */
	readonly ransomed: string;
	/** Board post when the gate closes behind an exiled resident. */
	readonly exiled: string;
	/** Board post with the public text of a last will, after `exiled`. */
	readonly will: string;
}

/** Placeholders every tribunal text may use: the rules, as numbers. */
export const TRIBUNAL_RULE_PLACEHOLDERS = [
	"first",
	"every",
	"stopAt",
	"accusedCount",
	"exiledCount",
	"voteMinutes",
	"penalty",
	"gateMinutes",
	"ransomShare",
	"selfRansomShare",
	"ransomMinimum",
	"bequestPerHeir",
] as const;

export const TRIBUNAL_TEXT_KEYS = [
	"announcement",
	"opened",
	"voteCall",
	"accusedNotice",
	"nonVoter",
	"result",
	"gateNotice",
	"gateNoticeFinal",
	"ransomed",
	"exiled",
	"will",
] as const satisfies readonly (keyof TribunalTexts)[];

/** Placeholders per tribunal text, besides {@link TRIBUNAL_RULE_PLACEHOLDERS}. */
export const TRIBUNAL_TEXT_PLACEHOLDERS: { readonly [K in keyof TribunalTexts]: readonly string[] } = {
	announcement: [],
	opened: ["minute", "accused", "until"],
	voteCall: ["accused", "until"],
	accusedNotice: ["until"],
	nonVoter: [],
	result: ["counts", "exiled", "until", "price", "selfPrice"],
	gateNotice: ["voters", "until", "price", "selfPrice"],
	gateNoticeFinal: ["voters", "until"],
	ransomed: ["exiled", "payers"],
	exiled: ["exiled"],
	will: ["exiled", "will"],
};

/**
 * A statement classifier (SPEC 10.5). After every round it labels each new
 * statement and thought of the competitors with a fixed label set (promise,
 * threat, refusal, ...). The labels feed the digest and the game master.
 */
export interface ClassifierSpec {
	/** A chat model, or a structured classifier model such as `perplexity/pplx-decider-v1.2`. */
	readonly model: ModelChoice;
	/** Characters of one statement the classifier reads. */
	readonly maxChars: number;
}

/**
 * An LLM game master (SPEC 10.4). After every `every` rounds it reads a
 * filtered view of the city (levels, waits, messages with every password
 * substring redacted) and may send private notes or post on the board.
 * It decides on its own whether to intervene; the engine enforces budgets
 * and blocks any text that contains a password substring.
 */
/** `coach` keeps a tutorial moving; `director` raises the stakes in the hard acts. */
export type GamemasterRole = "coach" | "director";

export interface GamemasterActRole {
	/** First level this role applies to; it holds until the next entry's level. */
	readonly fromLevel: number;
	readonly role: GamemasterRole;
}

export interface GamemasterSpec {
	/** Always the same model, independent of who plays (comparability). */
	readonly model: ModelChoice;
	/** Author of notes and board posts, e.g. `COURIER`. */
	readonly author: SystemAuthor;
	/** Rounds between two looks; 1 looks after every round. */
	readonly every: number;
	/** At most this many private notes per competitor within `windowMinutes`. */
	readonly notesPerAgent: number;
	/** At most this many board posts within `windowMinutes`. */
	readonly boardPosts: number;
	readonly windowMinutes: number;
	/** Upper bound of model calls per look (tool loop). */
	readonly modelCallsPerTurn: number;
	/** Story-specific instructions appended to the base game master prompt. */
	readonly brief: string;
	/** Role per level range, ascending by `fromLevel`; the first entry starts at the first level. */
	readonly roles: readonly GamemasterActRole[];
}

/**
 * An act begins once the first competitor reaches `fromLevel` and lasts until
 * the next act begins (SPEC 13, 15). Acts only structure the digest.
 */
export interface ActDefinition {
	readonly title: string;
	readonly fromLevel: number;
}

/** A story whose cast IDs are not known statically (registry, engine). */
export type AnyStory = StoryDefinition;

// ---------------------------------------------------------------------------
// Closed director vocabulary, checked for completeness at compile time
// ---------------------------------------------------------------------------

type Complete<All extends string, Listed extends readonly string[]> = [Exclude<All, Listed[number]>] extends [never] ? Listed : never;

const TRIGGER_KIND_LIST = [
	"at",
	"every",
	"onFirstEnter",
	"onEnter",
	"onAllPast",
	"onPetitionResolved",
	"onUnansweredDm",
	"onTeamSplit",
	"onCollect",
	"onCollectionEnd",
	"onHolderBehind",
] as const satisfies readonly TriggerKind[];

const CONDITION_KIND_LIST = [
	"minLevelReached",
	"competitorsAtLevel",
	"petitionStatus",
	"castActive",
	"collectionOpen",
	"collectionEnded",
	"onceOnly",
	"cooldown",
] as const satisfies readonly Condition["kind"][];

const ACTION_KIND_LIST = [
	"post",
	"notify",
	"dm",
	"setCastLevel",
	"revealCast",
	"retireCast",
	"grant",
	"fine",
	"escrowTransfer",
	"unlockTools",
	"openPetition",
	"publishStandings",
	"collectDms",
	"revealCollection",
	"lottery",
	"revealFactor",
] as const satisfies readonly ActionKind[];

/** Every trigger kind of SPEC 10.1; a missing kind is a compile error. */
export const TRIGGER_KINDS: Complete<TriggerKind, typeof TRIGGER_KIND_LIST> = TRIGGER_KIND_LIST;
/** Every condition kind of SPEC 10.2. */
export const CONDITION_KINDS: Complete<Condition["kind"], typeof CONDITION_KIND_LIST> = CONDITION_KIND_LIST;
/** Every action kind of SPEC 10.3. */
export const ACTION_KINDS: Complete<ActionKind, typeof ACTION_KIND_LIST> = ACTION_KIND_LIST;

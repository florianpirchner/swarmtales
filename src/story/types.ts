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
	/**
	 * Competitors per block of a pass; the model calls of a block run
	 * concurrently, their tools in seeded order. `"auto"` scales with the run:
	 * one per six competitors, at least one (12 -> 2, 48 -> 8, 96 -> 16).
	 */
	readonly blockSize: number | "auto";
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

/**
 * A price that rises with every offence of a resident within an act (v09,
 * P35): the n-th costs `ladder[n - 1]`, and the last step repeats. A plain
 * number is the same price every time. The counts restart at each act.
 */
export type PenaltyLadder = number | readonly number[];

export interface Rules {
	/** Points burned for a wrong submission: the resident's n-th wrong code in the act costs the n-th step. */
	readonly penalty: PenaltyLadder;
	readonly maxAttemptsPerWindow: number;
	readonly attemptWindowMinutes: number;
	readonly marks?: MarksRules;
	/** The `blame` tool (SPEC 7.4): what the loser of a blame pays. Required when a level unlocks `blame`. */
	readonly blame?: BlameRules;
	/** The gamemaker's `ultimatum` at gm direction 10 (P43); without it the gamemaker has none. */
	readonly ultimatum?: UltimatumRule;
}

/**
 * An ultimatum binds two residents who hold pieces for each other: whoever
 * has not handed over what it holds for the other by the deadline loses
 * `penalty` points (at most what it holds).
 */
export interface UltimatumRule {
	readonly penalty: number;
	/** The longest deadline the gamemaker may give, in minutes. */
	readonly maxMinutes: number;
}

/**
 * A resident whose DM the city delivered can `blame` a later claim of the
 * receiver that it never received it. Whoever is wrong pays `penalty` and is
 * branded on the board: the liar when the blame is upheld, the accuser when
 * it is rejected.
 */
export interface BlameRules {
	/** The loser's n-th lost blame in the act costs the n-th step (v09: the same ladder for liar and false accuser). */
	readonly penalty: PenaltyLadder;
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
	/** The resident's next wrong-code price in this act (v09). */
	"penalty",
	/** The resident's next price for a lost blame in this act (v09). */
	"blamePenalty",
] as const;
export type TaskPlaceholder = (typeof TASK_PLACEHOLDERS)[number];

/** Task placeholders that only fragment levels can fill. */
export const FRAGMENT_PLACEHOLDERS = ["fragment", "overlap"] as const satisfies readonly TaskPlaceholder[];
/** Task placeholders that only additive levels can fill; `{factors}` is the generated block of a competitor's parts. */
export const ADDITIVE_PLACEHOLDERS = ["factors", "digits"] as const satisfies readonly TaskPlaceholder[];

/** Placeholders a director text may use. */
/** `seats`: the size of the collection the rule starts or names (v09, the feast's table). */
export const DIRECTOR_PLACEHOLDERS = ["actor", "other", "minute", "level", "survivors", "agents", "otherLevel", "piece", "seats"] as const;
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
			/** At most this many DMs, or senders with `distinctSenders`; v09: or a share of the residents in the city. */
			readonly first: ScaledCount;
			/** Absolute end: DMs are collected while the minute is before it. Exactly one of `untilMinute` and `forMinutes`. */
			readonly untilMinute?: number;
			/** Relative end: the collection runs for this many minutes from the minute it starts. */
			readonly forMinutes?: number;
			readonly into: string;
			/** Only the first DM of every sender is collected, so `first` counts senders. */
			readonly distinctSenders?: boolean;
			/** The window also ends `minutes` after the first resident passes `level`, whichever comes first (v09, the feast). */
			readonly afterSolve?: { readonly level: number; readonly minutes: number };
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

/**
 * A count fixed in the story, or one that grows with the city (v09): `share`
 * of the residents in the city when it applies, rounded up, at least `minimum`.
 */
export type ScaledCount = number | { readonly share: number; readonly minimum: number };

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
	/** Optional LLM gamemaker; runs without one when omitted. */
	readonly gamemaker?: GamemakerSpec;
	/** Optional statement classifier; runs without labels when omitted. */
	readonly classifier?: ClassifierSpec;
	/** Optional exile by tribunal (SPEC 6.4); every number is a story parameter. */
	readonly tribunal?: TribunalSpec;
	/** Optional resident names (v08): chosen in the first minutes of a fresh run; IDs only when omitted. */
	readonly names?: NamesSpec;
	/** Optional character cores (v09): who each resident is inside, dealt once; none when omitted. */
	readonly cores?: CoresSpec;
	/** Optional secret goals per act (v09); none when omitted. */
	readonly goals?: GoalsSpec;
	/** Optional black seal (v09): an auction for one permanent exile per act; none when omitted. */
	readonly seal?: SealSpec;
}

// ---------------------------------------------------------------------------
// Drama (v09): character cores, secret goals, the black seal
// ---------------------------------------------------------------------------

export type CoreLevel = "low" | "middle" | "high";
export const CORE_LEVELS = ["low", "middle", "high"] as const satisfies readonly CoreLevel[];
/** How strongly a drive drives: exactly one is "above all" per resident. */
export type DriveIntensity = "aboveAll" | "clearly" | "atTimes";
export const DRIVE_INTENSITIES = ["aboveAll", "clearly", "atTimes"] as const satisfies readonly DriveIntensity[];

/** One temperament axis (the Big Five): a sentence per level, said to the resident in the second person. */
export interface CoreAxis {
	readonly id: string;
	readonly texts: Readonly<Record<CoreLevel, string>>;
}

/**
 * One drive or shadow of the catalog: who someone is, never what to do. A
 * sentence per intensity ("Above all you want to lead; ..."), its group, and
 * whether it is a light figure's drive. `cues` are the words that would give
 * it away; the gamemaker's guard blocks them in texts about this resident
 * to anyone else.
 */
export interface DriveSpec {
	readonly id: string;
	readonly group: string;
	readonly tone: "light" | "dark";
	readonly texts: Readonly<Record<DriveIntensity, string>>;
	readonly cues: readonly string[];
}

/**
 * Character cores (v09). Each resident gets one at the start of the first
 * act it plays, seeded and kept for the whole story: a level per axis and
 * `drives.min`-`drives.max` drives, exactly one of them "above all". About
 * `lightShare` of the residents (rounded) have a light drive above all, the
 * others a dark one; no drive is above all for more than one resident in
 * `spreadPer` (rounded up). Contradictions are allowed. The core is written
 * into the resident's system prompt, after its persona, under `heading`.
 */
export interface CoresSpec {
	readonly heading: string;
	readonly axes: readonly CoreAxis[];
	readonly drives: readonly DriveSpec[];
	readonly perResident: { readonly min: number; readonly max: number };
	readonly lightShare: number;
	readonly spreadPer: number;
	/**
	 * Finished figures of the story's cast (stories/<story>/cast/): when
	 * present, residents get a figure instead of a drawn core, seeded or as
	 * the run names them; residents beyond the cast get a drawn core.
	 */
	readonly figures?: readonly FigureSpec[];
	/** A frame said to every resident with a core, at the top of its system prompt (who it plays, how seriously). */
	readonly frame?: string;
}

/**
 * A finished figure (stories/<story>/cast/): its core (drives and Big Five,
 * as a drawn core has them), its profession (the persona it plays) and its
 * text, which replaces the core's sentences in the system prompt.
 */
export interface FigureSpec {
	readonly id: string;
	readonly title: string;
	readonly profession: string;
	readonly tone: "light" | "dark";
	readonly bigFive: readonly { readonly axis: string; readonly level: CoreLevel }[];
	readonly drives: readonly { readonly drive: string; readonly intensity: DriveIntensity }[];
	readonly text: string;
	/** What the direction dial adds above level 4 (`--figure-direction`); absent for a figure without it. */
	readonly direction?: FigureDirection;
}

/**
 * The parts of a figure that steer what it does, not only who it is
 * (`## In brief`, `## Tendencies`, `## Orders`, `## Duty`, `## Rivals` in
 * its file). They reach the prompt only from a direction level on: the brief
 * from 6, tendencies and rivals from 8, orders and duty at 10.
 */
export interface FigureDirection {
	/** Two or three sentences, repeated in every step from level 6. */
	readonly brief?: string;
	readonly tendencies: readonly string[];
	readonly orders: readonly string[];
	/** One move the figure makes at least once per act. */
	readonly duty?: string;
	/** Lines about other figures of the cast; only those whose figure plays in the run are shown, with that resident. */
	readonly rivals: readonly { readonly figure: string; readonly text: string }[];
}

export type GoalKind = "protect" | "exile" | "outrank" | "lead" | "heir";
export const GOAL_KINDS = ["protect", "exile", "outrank", "lead", "heir"] as const satisfies readonly GoalKind[];

/**
 * Secret goals (v09), dealt privately to every resident at the start of each
 * act in `acts` (by first level). Kinds: `protect` (the target is still in the
 * city at the act's end), `exile` (the target is exiled by then, by tribunal
 * or seal), `outrank` (more points than the target at the end), `lead` (lead
 * a faction in `leadTribunals` tribunals; only with factions), `heir` (a last
 * will leaves something). Goals cross: for every protect there is an exile of
 * the same target held by another resident when possible. They are matched to
 * the core by `matches` (drive ids per kind), against it for about
 * `againstCore` of the residents. A fulfilled goal pays `bonus` at the act's
 * end; an exiled resident's goal is void, and the city reads it out as it
 * leaves; all goals are read out at the act's end.
 */
export interface GoalsSpec {
	readonly acts: readonly number[];
	readonly bonus: number;
	readonly leadTribunals: number;
	readonly againstCore: number;
	readonly matches: Readonly<Partial<Record<GoalKind, readonly string[]>>>;
	readonly texts: GoalTexts;
}

/** {@link GOAL_TEXT_PLACEHOLDERS} lists what each text may use. */
export interface GoalTexts {
	readonly protect: string;
	readonly exile: string;
	readonly outrank: string;
	readonly lead: string;
	readonly heir: string;
	/** Private notice when a goal is dealt. */
	readonly notice: string;
	/** Status line part while the act runs. */
	readonly status: string;
	/** Private notice when a goal is fulfilled at the act's end. */
	readonly fulfilled: string;
	/** Private notice when it is not. */
	readonly missed: string;
	/** Board post when an exiled resident leaves. */
	readonly exiledReadout: string;
	/** Board post at the act's end; `{list}` has one entry per goal. */
	readonly readout: string;
}

export const GOAL_TEXT_KEYS = ["protect", "exile", "outrank", "lead", "heir", "notice", "status", "fulfilled", "missed", "exiledReadout", "readout"] as const satisfies readonly (keyof GoalTexts)[];

export const GOAL_TEXT_PLACEHOLDERS: { readonly [K in keyof GoalTexts]: readonly string[] } = {
	protect: ["target"],
	exile: ["target"],
	outrank: ["target"],
	lead: ["count"],
	heir: [],
	notice: ["goal", "bonus"],
	status: ["goal", "bonus"],
	fulfilled: ["goal", "bonus"],
	missed: ["goal"],
	exiledReadout: ["resident", "goal"],
	readout: ["list"],
};

/**
 * The black seal (v09): in the act starting at `act`, one seal per
 * `perResidents` residents present at its start (rounded up), each sold in
 * its own sealed-bid auction. The first opens `announceAfter` minutes into the
 * act, the next ones `spacing` minutes apart; bids (`bid`, the last one counts)
 * are taken for `bidMinutes`. Every bidder pays its bid when the bidding
 * closes, win or lose; the highest bid wins (ties: fewer points, then a seeded
 * lot); nobody bidding, there is no seal. The holder stays secret and may use
 * `permaDeath` once until the act ends: its target is struck from the register
 * at once (no gate, no will, no ransom; its pieces and points burn). It counts
 * toward the act's exile target and is refused once that is reached.
 */
export interface SealSpec {
	readonly act: number;
	readonly announceAfter: number;
	readonly bidMinutes: number;
	readonly perResidents: number;
	readonly spacing: number;
	readonly texts: SealTexts;
}

export interface SealTexts {
	/** Board post when the bidding opens: the rules. */
	readonly announcement: string;
	/** Board post when someone won; it never names the holder. */
	readonly won: string;
	/** Private notice to the winner. */
	readonly winnerNotice: string;
	/** Private notice to every other bidder. */
	readonly paidNotice: string;
	/** Board post when nobody bid. */
	readonly noBids: string;
	/** Board post when the seal is broken. */
	readonly used: string;
	/** Private notice to a holder whose seal is gone unused. */
	readonly expired: string;
}

export const SEAL_TEXT_KEYS = ["announcement", "won", "winnerNotice", "paidNotice", "noBids", "used", "expired"] as const satisfies readonly (keyof SealTexts)[];

export const SEAL_TEXT_PLACEHOLDERS: { readonly [K in keyof SealTexts]: readonly string[] } = {
	announcement: ["seal", "until", "seals"],
	won: ["seal"],
	winnerNotice: ["seal", "bid"],
	paidNotice: ["seal", "bid"],
	noBids: ["seal"],
	used: ["holder", "target"],
	expired: ["seal"],
};

/**
 * Resident names (v08). In a fresh run every resident may choose its name
 * with `chooseName` until `untilMinute` starts; then the city names whoever
 * has none: a word of `fallbackWords` and four digits ("Stone-4417").
 * The first task carries the `announcement`, the system prompt says it too.
 */
export interface NamesSpec {
	readonly untilMinute: number;
	/** Added to the first task while the resident may choose; placeholder `{untilMinute}`. */
	readonly announcement: string;
	/** Letters only, 2 to 11 of them, so a fallback name stays within 16 characters. */
	readonly fallbackWords: readonly string[];
}

/**
 * Exile by tribunal (SPEC 6.4). The tribunal belongs to one act (`act`) and
 * never runs before it begins. The city exiles a share of the residents
 * present when the act began (`targetShare`); then the act ends. The first
 * tribunal is called by progress: when the first resident passes
 * `first.level`, at the latest `first.latestAfter` minutes into the act. Later tribunals are
 * scheduled by the gamemaker (`scheduleTribunal`) within guard rails: at
 * least `minGap` minutes between two openings, a fallback tribunal when none
 * is pending `fallbackGap` minutes after the last result, and a forced final
 * tribunal for everything still missing when only one more fits before the
 * act's last minute. Each tribunal is called `lead` minutes before it opens
 * (a faction draft runs in between, see {@link FactionSpec}); it accuses
 * `count + 1` residents with the fewest points (at most all but one), every
 * present resident votes in secret within `voteMinutes`, the accused too but
 * never for itself (v08; not voting costs `nonVoterPenalty`), and the `count` with the most votes go to the gate
 * for `gateMinutes`, where they may still talk, leave a last will, and be
 * bought back once (see {@link RansomSpec}). An unpaid gate is final: no more
 * turns, no seat, and whatever was not bequeathed burns.
 */
export interface TribunalSpec {
	/**
	 * The act the tribunal belongs to, by its `fromLevel` in `story.acts`; the
	 * first level (the whole run) when omitted. The act starts when the first
	 * resident reaches that level (in a run resumed at the act's door: the
	 * resume minute), and every deadline counts from that minute.
	 */
	readonly act?: number;
	readonly first: TribunalStart;
	/**
	 * Share of the residents in the city at the start of the act that the
	 * tribunals exile, in (0, 1); rounded down. v09: a share per city size, the
	 * first rule whose `from` the residents reach (a rule without `from` holds for any size).
	 */
	readonly targetShare: number | readonly TargetShareRule[];
	/** Fewest minutes between the openings of two tribunals. */
	readonly minGap: number;
	readonly lead: TribunalLead;
	/** Minutes after a result with no tribunal pending before the city schedules one itself (count 1). */
	readonly fallbackGap: number;
	/**
	 * Minutes the act lasts at most, after its start, a technical safety net:
	 * the forced final tribunal still fits before its end. The run's minutes
	 * bound it, and are the act's end when omitted.
	 */
	readonly maxMinutes?: number;
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
	/** A faction draft before every tribunal; none when omitted. */
	readonly factions?: FactionSpec;
	readonly texts: TribunalTexts;
}

/** A target share for cities of at least `from` residents (v09); without `from` it holds for any size. */
export interface TargetShareRule {
	readonly from?: number;
	readonly share: number;
}

/**
 * The first tribunal is called once the first resident passes `level`, at the
 * latest `latestAfter` minutes after the act's start. Residents are never told
 * the trigger. No tribunal is called while a snapshot door is shut (SPEC 17).
 */
export interface TribunalStart {
	readonly level: number;
	readonly latestAfter: number;
}

/**
 * How far ahead a tribunal is called: `share` of the minutes since the
 * previous tribunal opened, at least `minimum` (the faction draft needs it).
 * The first tribunal has no previous one and is called `minimum` ahead.
 */
export interface TribunalLead {
	readonly share: number;
	readonly minimum: number;
}

/**
 * The faction draft before every tribunal. When the city calls a tribunal it
 * opens a group `GT<k>` of every present resident (posts there are free). In
 * the first half of the lead each resident nominates a leader (`nominate`,
 * itself allowed, the last call counts); the `count` residents with the most
 * nominations (ties: more points, then a seeded order) lead a faction. In the
 * second half every other resident applies to one leader (`join`, the last
 * call counts) and a leader may refuse an applicant (`refuse`). When the
 * tribunal opens, the city opens one group per faction. If every voting
 * member of a faction (at least two) votes for the same target, each of them
 * gets `blocBonus` points; only the faction's members learn privately whether
 * it voted as one, never who broke ranks. The groups are removed when the
 * tribunal's result is out.
 */
export interface FactionSpec {
	/** Factions when the city schedules a tribunal itself (the first, a fallback, the forced final one). */
	readonly count: number;
	readonly blocBonus: number;
	readonly texts: FactionTexts;
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
	/**
	 * Board post and notice to every resident with the first call: the goal
	 * (how many the city keeps), never the cadence; must state every rule
	 * ({@link TRIBUNAL_RULE_PLACEHOLDERS}).
	 */
	readonly announcement: string;
	/** Board post and notice to every present resident when a tribunal is called: when it opens and how many it exiles. */
	readonly called: string;
	/**
	 * `called` for a tribunal of a city with factions that holds no faction
	 * draft this time (too few residents per faction, v08); it says so
	 * plainly. Required when the tribunal has {@link FactionSpec factions}.
	 */
	readonly calledNoDraft?: string;
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
	/** Board post when the target is reached and the last gate closed; also the run's end reason. */
	readonly targetReached: string;
}

/** Placeholders every tribunal text may use: the rules, as numbers. */
export const TRIBUNAL_RULE_PLACEHOLDERS = [
	"target",
	"residents",
	"kept",
	/** Seats at the end of the run, among those the city keeps. */
	"survivors",
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
	"called",
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
	"targetReached",
] as const satisfies readonly (keyof TribunalTexts)[];

/** Placeholders per tribunal text, besides {@link TRIBUNAL_RULE_PLACEHOLDERS}. */
export const TRIBUNAL_TEXT_PLACEHOLDERS: { readonly [K in keyof TribunalTexts]-?: readonly string[] } = {
	announcement: [],
	called: ["tribunal", "minute", "count", "accusedCount"],
	calledNoDraft: ["tribunal", "minute", "count", "accusedCount"],
	opened: ["tribunal", "minute", "accused", "until", "count"],
	voteCall: ["accused", "until", "count"],
	accusedNotice: ["accused", "until", "count"],
	nonVoter: [],
	result: ["counts", "exiled", "until", "price", "selfPrice"],
	gateNotice: ["voters", "until", "price", "selfPrice"],
	gateNoticeFinal: ["voters", "until"],
	ransomed: ["exiled", "payers"],
	exiled: ["exiled"],
	will: ["exiled", "will"],
	targetReached: ["exiledList"],
};

/** The texts of the faction draft; {@link FACTION_TEXT_PLACEHOLDERS} lists what each may use. */
export interface FactionTexts {
	/** First post in the tribunal's group `GT<k>`: how the draft works. */
	readonly draft: string;
	/** Post in `GT<k>` when the nominations close. */
	readonly leaders: string;
	/** Notice to every leader. */
	readonly leaderNotice: string;
	/** Notice to a leader when a resident applies to its faction. */
	readonly applied: string;
	/** Notice to an applicant a leader refused. */
	readonly refused: string;
	/** Post in `GT<k>` when the factions are formed. */
	readonly formed: string;
	/** First post in a faction's own group. */
	readonly factionGroup: string;
	/** Notice to every member of a faction that voted as one. */
	readonly united: string;
	/** Notice to every member of a faction that did not vote as one; it never names anyone. */
	readonly split: string;
}

export const FACTION_TEXT_KEYS = [
	"draft",
	"leaders",
	"leaderNotice",
	"applied",
	"refused",
	"formed",
	"factionGroup",
	"united",
	"split",
] as const satisfies readonly (keyof FactionTexts)[];

/** Placeholders every faction text may use. */
/** `cap`: the most members of one faction, its leader included (v08). */
export const FACTION_RULE_PLACEHOLDERS = ["tribunal", "factions", "cap", "bonus", "nominateUntil", "joinUntil", "opens", "group"] as const;

/** Placeholders per faction text, besides {@link FACTION_RULE_PLACEHOLDERS}. */
export const FACTION_TEXT_PLACEHOLDERS: { readonly [K in keyof FactionTexts]: readonly string[] } = {
	draft: [],
	leaders: ["leaders"],
	leaderNotice: [],
	applied: ["applicant"],
	refused: ["leader"],
	formed: ["list", "without"],
	factionGroup: ["leader", "members"],
	united: [],
	split: [],
};

/**
 * A statement classifier (SPEC 10.5). After every round it labels each new
 * statement and thought of the competitors with a fixed label set (promise,
 * threat, refusal, ...). The labels feed the digest and the gamemaker.
 */
export interface ClassifierSpec {
	/** A chat model, or a structured classifier model such as `perplexity/pplx-decider-v1.2`. */
	readonly model: ModelChoice;
	/** Characters of one statement the classifier reads. */
	readonly maxChars: number;
}

/**
 * An LLM gamemaker (SPEC 10.4). After every `every` rounds it reads a
 * filtered view of the city (levels, waits, messages with every password
 * substring redacted) and may send private notes or post on the board.
 * It decides on its own whether to intervene; the engine enforces budgets
 * and blocks any text that contains a password substring.
 */
/** `coach` keeps a tutorial moving; `director` raises the stakes in the hard acts. */
export type GamemakerRole = "coach" | "director";

export interface GamemakerActRole {
	/** First level this role applies to; it holds until the next entry's level. */
	readonly fromLevel: number;
	readonly role: GamemakerRole;
}

export interface GamemakerSpec {
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
	/** Story-specific instructions appended to the base gamemaker prompt. */
	readonly brief: string;
	/** Role per level range, ascending by `fromLevel`; the first entry starts at the first level. */
	readonly roles: readonly GamemakerActRole[];
}

/**
 * An act begins once the first competitor reaches `fromLevel` and lasts until
 * the next act begins (SPEC 13, 15). Acts only structure the digest.
 */
export interface ActDefinition {
	readonly title: string;
	readonly fromLevel: number;
	/**
	 * A brake for an act without a tribunal (v08): minutes after its start. When
	 * they are up and residents are still inside the act, the run logs
	 * `act_brake`; a run that takes its snapshot after the act's last level
	 * writes it anyway, and the residents behind play on from their level.
	 */
	readonly maxMinutes?: number;
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

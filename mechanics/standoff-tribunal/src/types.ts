// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal's state and ports (the old `HoldoutTribunal`'s fields and `HoldoutPorts`, carried from the old
 * `mechanics/standoff-tribunal/src/types.ts`). The mechanic owns the state (`HoldoutData`); the court reads and writes
 * it through the ports of the call at hand.
 */
import type { Static } from "typebox";
import type { StandoffTribunalEvents } from "./contract.ts";

type Events = (typeof StandoffTribunalEvents)["events"];

/**
 * `blocker` has reached open `door` (`passed` it already) and `lacking` stand before it without its fragment.
 *
 * @public
 */
export interface BlockerFact {
	/** The door. */
	readonly door: number;
	/** The holder of the fragment. */
	readonly blocker: string;
	/** Who stands before the door without it. */
	readonly lacking: readonly string[];
	/** Whether the holder has passed the door. */
	readonly passed: boolean;
}

/**
 * A resident at an open fragment door, reached (passed or not).
 *
 * @public
 */
export interface Presence {
	/** The door. */
	readonly door: number;
	/** The resident. */
	readonly agent: string;
}

/**
 * A blocker as the city reports it, with the tick it first found it.
 *
 * @public
 */
export interface Blocker extends BlockerFact {
	/** The tick the city first found it. */
	readonly since: number;
}

/**
 * The stage of a running tribunal.
 *
 * @public
 */
export type HoldoutStage = "grace" | "vote" | "banish" | "lot";

/**
 * An outcome the Director should announce.
 *
 * @public
 */
export type HoldoutOutcome = "dropped" | "graceFailed" | "voteFailed" | "spared";

/**
 * The count of one vote.
 *
 * @public
 */
export interface VoteResult {
	/** The vote's number. */
	readonly vote: number;
	/** Yes ballots. */
	readonly yes: number;
	/** The other voters. */
	readonly no: number;
}

/**
 * The running tribunal.
 *
 * @public
 */
export interface Session {
	/** The tribunal's number. */
	readonly number: number;
	/** The accused. */
	readonly accused: string;
	/** The door it blocks. */
	readonly door: number;
	/** The stage. */
	stage: HoldoutStage;
	/** The tick the stage ends. */
	until: number;
	/** The number of the open or last vote; 0 in the grace. */
	vote: number;
	/** Who votes. */
	voters: string[];
	/** The ballots of the open vote. */
	readonly ballots: Map<string, boolean>;
	/** The count of the last vote. */
	lastResult?: VoteResult;
	/** The resident the final lot drew. */
	drawn?: string;
}

/**
 * An outcome the Director should announce; the city posts `text` at `due` if it does not.
 *
 * @public
 */
export interface HoldoutPending {
	/** The tribunal's number. */
	readonly tribunal: number;
	/** The outcome. */
	readonly kind: HoldoutOutcome;
	/** The facts for the Director's report. */
	readonly facts: string;
	/** The city's own line. */
	readonly text: string;
	/** The tick the city posts it. */
	readonly due: number;
}

/**
 * The mechanic's state: the old `HoldoutTribunal` fields, and the level whose task each resident last read.
 *
 * @public
 */
export interface HoldoutData {
	/** The blockers by `door:agent`. */
	readonly blockers: Map<string, Blocker>;
	/** The struck, in order. */
	readonly struck: string[];
	/** When the city first saw each resident at each open fragment door (`door:agent`). */
	readonly reached: Map<string, number>;
	/** Doors where the lot has struck. */
	readonly lotDoors: number[];
	/** Tribunals called. */
	tribunals: number;
	/** Lots drawn. */
	lots: number;
	/** No tribunal is called before this tick (after one ended); 0 when none ended. */
	cooldownUntil: number;
	/** The running tribunal. */
	session: Session | undefined;
	/** The outcome that waits to be announced. */
	pending: HoldoutPending | undefined;
	/** The level whose task each resident last read, for the rule under a new task. */
	readonly shown: Map<string, number>;
}

/**
 * The texts of the holdout tribunal (old `HoldoutTexts`).
 *
 * @public
 */
export interface HoldoutTexts {
	/** The rule in the task. */
	readonly rule: string;
	/** The call on the board. */
	readonly called: string;
	/** The lot that drew the accused. */
	readonly drawnAccused: string;
	/** The vote opened. */
	readonly voteOpened: string;
	/** The accused's notice of a vote. */
	readonly accusedVote: string;
	/** A strike on the board. */
	readonly struck: string;
	/** The struck resident's notice. */
	readonly struckNotice: string;
	/** The released fragments. */
	readonly released: string;
	/** The tribunal dropped. */
	readonly dropped: string;
	/** The grace ended without the fragment. */
	readonly graceFailed: string;
	/** A vote without unanimity. */
	readonly voteFailed: string;
	/** A banishment by vote. */
	readonly banished: string;
	/** A strike by lot. */
	readonly lot: string;
	/** The accused spared. */
	readonly spared: string;
}

/**
 * The rule of the holdout tribunal: the game's options.
 *
 * @public
 */
export interface HoldoutRule {
	/** Ticks before the city reports a blocker; also the pause after a tribunal. */
	readonly stallMinutes: number;
	/** Ticks of grace after a call. */
	readonly graceMinutes: number;
	/** Ticks a vote stays open. */
	readonly voteMinutes: number;
	/** Votes in all before the lot strikes. */
	readonly maxVotes: number;
	/** Ticks before the city announces in the Director's place. */
	readonly fallbackMinutes: number;
	/** The texts. */
	readonly texts: HoldoutTexts;
}

/**
 * What the court reads and does in the city.
 *
 * @public
 */
export interface HoldoutPorts {
	/** The tick now. */
	readonly minute: () => number;
	/** Residents in the city, the struck excluded. */
	readonly alive: () => readonly string[];
	/** Everyone who lacks a fragment now, by holder and door, without the stall. */
	readonly blockers: () => readonly BlockerFact[];
	/** Every resident in the city at an open fragment door it has reached. */
	readonly present: () => readonly Presence[];
	/** Who stands before `door` without `holder`'s fragment of it now. */
	readonly lacking: (door: number, holder: string) => readonly string[];
	/** `Mira (A03)`. */
	readonly label: (agent: string) => string;
	/** A post on the board. */
	readonly post: (author: string, text: string) => void;
	/** A private notice. */
	readonly notify: (agent: string, author: string, text: string) => void;
	/** An event of the tribunal. */
	readonly emit: <K extends keyof Events>(type: K, payload: Static<Events[K]>) => void;
	/** The `n`-th lot of the run among `sorted` (old `rngFor(seed, "holdout-lot", n).pick(sorted)`). */
	readonly pick: (lot: number, sorted: readonly string[]) => string;
	/** The strike's own part in the city (old `#onStruck`): banished for good, then the released fragments. */
	readonly struck: (agent: string) => void;
}

/**
 * The state of a fresh run.
 *
 * @returns The empty tribunal.
 * @public
 */
export function emptyHoldout(): HoldoutData {
	return { blockers: new Map(), struck: [], reached: new Map(), lotDoors: [], tribunals: 0, lots: 0, cooldownUntil: 0, session: undefined, pending: undefined, shown: new Map() };
}

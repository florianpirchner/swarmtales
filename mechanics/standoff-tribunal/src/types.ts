/**
 * The holdout tribunal's state and ports (the old `HoldoutTribunal`'s fields and `HoldoutPorts`,
 * packages/engine/src/holdout.ts). The mechanic owns the state (`HoldoutData`); the court reads and
 * writes it through the ports of the call at hand.
 */
import type { Static } from "typebox";
import type { holdoutEvents } from "./events.ts";

/** `blocker` has reached open `door` (`passed` it already) and `lacking` stand before it without its fragment. */
export interface BlockerFact {
	readonly door: number;
	readonly blocker: string;
	readonly lacking: readonly string[];
	readonly passed: boolean;
}

/** A resident at an open fragment door, reached (passed or not). */
export interface Presence {
	readonly door: number;
	readonly agent: string;
}

/** A blocker as the city reports it, with the minute it first found it. */
export interface Blocker extends BlockerFact {
	readonly since: number;
}

export type HoldoutStage = "grace" | "vote" | "banish" | "lot";
export type HoldoutOutcome = "dropped" | "graceFailed" | "voteFailed" | "spared";

export interface VoteResult {
	readonly vote: number;
	readonly yes: number;
	readonly no: number;
}

/** The running tribunal. */
export interface Session {
	readonly number: number;
	readonly accused: string;
	readonly door: number;
	stage: HoldoutStage;
	until: number;
	vote: number;
	voters: string[];
	readonly ballots: Map<string, boolean>;
	lastResult?: VoteResult;
	drawn?: string;
}

/** An outcome the gamemaker should announce; the city posts `text` at `due` if it does not. */
export interface HoldoutPending {
	readonly tribunal: number;
	readonly kind: HoldoutOutcome;
	readonly facts: string;
	readonly text: string;
	readonly due: number;
}

/** The mechanic's state: the old `HoldoutTribunal` fields. */
export interface HoldoutData {
	readonly blockers: Map<string, Blocker>;
	readonly struck: string[];
	/** When the city first saw each resident at each open fragment door (`door:agent`). */
	readonly reached: Map<string, number>;
	/** Doors where the lot has struck. */
	readonly lotDoors: number[];
	tribunals: number;
	lots: number;
	/** No tribunal is called before this minute (after one ended); 0 when none ended. */
	cooldownUntil: number;
	session: Session | undefined;
	pending: HoldoutPending | undefined;
}

export interface HoldoutTexts {
	readonly rule: string;
	readonly called: string;
	readonly drawnAccused: string;
	readonly voteOpened: string;
	readonly accusedVote: string;
	readonly struck: string;
	readonly struckNotice: string;
	readonly released: string;
	readonly dropped: string;
	readonly graceFailed: string;
	readonly voteFailed: string;
	readonly banished: string;
	readonly lot: string;
	readonly spared: string;
}

export interface HoldoutRule {
	readonly stallMinutes: number;
	readonly graceMinutes: number;
	readonly voteMinutes: number;
	readonly maxVotes: number;
	readonly fallbackMinutes: number;
	readonly texts: HoldoutTexts;
}

export interface HoldoutPorts {
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
	readonly post: (author: string, text: string) => void;
	readonly notify: (agent: string, author: string, text: string) => void;
	readonly emit: <K extends keyof typeof holdoutEvents>(type: K, payload: Static<(typeof holdoutEvents)[K]>) => void;
	/** The `n`-th lot of the run among `sorted` (old `rngFor(seed, "holdout-lot", n).pick(sorted)`). */
	readonly pick: (lot: number, sorted: readonly string[]) => string;
	/** The world's part of a strike, after the court ended the session: exile, and the fragments go to everyone left. */
	readonly struck: (agent: string) => void;
}

export function emptyHoldout(): HoldoutData {
	return { blockers: new Map(), struck: [], reached: new Map(), lotDoors: [], tribunals: 0, lots: 0, cooldownUntil: 0, session: undefined, pending: undefined };
}

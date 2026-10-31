/**
 * The tribunal's state: what the old `Tribunal` kept besides the gate (the gates, the exiled and
 * the ransomed are the exile's now), as plain data, and the faction draft (old `FactionDraft`).
 * Lists stand in for the old maps and keep their order: a key set again stays where it was, a key
 * deleted and set again moves to the end.
 */

/** Who planned a tribunal (old `TribunalPlanner`). */
export type Planner = "progress" | "deadline" | "gamemaker" | "fallback" | "final";

export interface Vote {
	readonly voter: string;
	readonly target: string;
}

export interface Session {
	readonly tribunal: number;
	readonly minute: number;
	readonly accused: readonly string[];
	readonly voters: readonly string[];
	readonly until: number;
	readonly count: number;
	/** In the order the votes were cast (old `Map` order). */
	readonly votes: Vote[];
	closed: boolean;
}

/** A tribunal planned and not yet open (old `TribunalPlan`). */
export interface Plan {
	readonly tribunal: number;
	readonly opens: number;
	readonly calledAt: number;
	readonly count: number;
	readonly factions: number;
	readonly by: Planner;
	readonly reason?: string;
	readonly called: boolean;
}

export interface Faction {
	readonly leader: string;
	readonly group: string;
	readonly members: readonly string[];
}

/** A faction draft (old `FactionDraft`, its snapshot fields). */
export interface Draft {
	readonly tribunal: number;
	readonly factions: number;
	readonly group: string;
	readonly members: readonly string[];
	readonly nominateUntil: number;
	readonly opens: number;
	readonly cap: number;
	readonly nominations: { readonly voter: string; nominee: string }[];
	leaders: readonly string[] | undefined;
	readonly applications: { readonly agent: string; leader: string }[];
	readonly refusals: { readonly leader: string; readonly agent: string }[];
	formed: readonly Faction[] | undefined;
}

export interface TribunalState {
	announced: boolean;
	readonly sessions: Session[];
	/** Residents at the start of the act; undefined before it. */
	residents: number | undefined;
	actStart: number | undefined;
	called: number;
	plan: Plan | undefined;
	lastResult: number | undefined;
	ended: boolean;
	halted: boolean;
	draft: Draft | undefined;
	/** The last minute the city acted in (old `#lastTick`); the gamemaker's plans start after it. */
	lastTick: number;
}

export function emptyTribunal(): TribunalState {
	return {
		announced: false,
		sessions: [],
		residents: undefined,
		actStart: undefined,
		called: 0,
		plan: undefined,
		lastResult: undefined,
		ended: false,
		halted: false,
		draft: undefined,
		lastTick: -1,
	};
}

/** The open session, if a vote is running (old `#current`). */
export function currentSession(state: TribunalState): Session | undefined {
	return state.sessions.find((session) => !session.closed);
}

/** Old `#previousOpening`. */
export function previousOpening(state: TribunalState): number | undefined {
	return state.sessions.at(-1)?.minute;
}

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The parts of a game's data that compose the gamemaker's system text (carried from the old
 * `@swarmtales/contracts` `story.ts`: `GamemakerSpec`, `GamemakerActRole`, `Rules`, `HoldoutSpec`, the direction
 * levels), reduced to the fields the composer reads. A game passes its own typed constants; the oracle setups
 * (`oracles/<game>/setup/*.story.json`) hold the same data.
 */

/**
 * The defined steps of the direction dial (old `DIRECTION_LEVELS`).
 *
 * @public
 */
export const DIRECTION_LEVELS = [0, 4, 6, 8, 10] as const;

/**
 * A step of the direction dial: how strongly the gamemaker steers (`--gm-direction` on the old platform).
 *
 * @public
 */
export type DirectionLevel = (typeof DIRECTION_LEVELS)[number];

/**
 * `coach` keeps a tutorial moving; `director` raises the stakes in the hard acts; `keeper` keeps a city moving
 * with nudges and runs its holdout tribunals, with no intrigue of its own (old `GamemakerRole`).
 *
 * @public
 */
export type GamemakerRole = "coach" | "director" | "keeper";

/**
 * The gamemaker's role from one level on (old `GamemakerActRole`).
 *
 * @public
 */
export interface GamemakerActRole {
	/** First level this role applies to; it holds until the next entry's level. */
	readonly fromLevel: number;
	/** The role. */
	readonly role: GamemakerRole;
}

/**
 * The game's spec of its gamemaker (old `GamemakerSpec`, without the model, which is the game's model block).
 *
 * @public
 */
export interface GamemakerSpec {
	/** Author of notes and board posts, e.g. `COURIER`. */
	readonly author: string;
	/** Rounds between two looks; 1 looks after every round. */
	readonly every: number;
	/** At most this many private notes per resident within `windowMinutes`. */
	readonly notesPerAgent: number;
	/** At most this many board posts within `windowMinutes`. */
	readonly boardPosts: number;
	/** The sliding window of the note budget, in ticks. */
	readonly windowMinutes: number;
	/** Game-specific instructions appended to the base system text. */
	readonly brief: string;
	/** Role per level range, ascending by `fromLevel`. */
	readonly roles: readonly GamemakerActRole[];
}

/**
 * Points per offence: one number, or a ladder whose last step repeats (old `PenaltyLadder`).
 *
 * @public
 */
export type PenaltyLadder = number | readonly number[];

/**
 * The game's rules the system text names (old `Rules`, the fields read here).
 *
 * @public
 */
export interface GamemakerRules {
	/** Points burned for a wrong submission. */
	readonly penalty: PenaltyLadder;
	/** The gamemaker's `ultimatum` at direction 10; without it the gamemaker has none. */
	readonly ultimatum?: { readonly penalty: number; readonly maxMinutes: number };
}

/**
 * The timing of the holdout tribunal of Whispers (old `HoldoutSpec`, without its texts).
 *
 * @public
 */
export interface HoldoutTiming {
	/** Ticks at a door before a resident is a blocker. */
	readonly stallMinutes: number;
	/** Ticks of grace after a tribunal is called. */
	readonly graceMinutes: number;
	/** Ticks of one vote. */
	readonly voteMinutes: number;
	/** Votes before the lot. */
	readonly maxVotes: number;
	/** Ticks the city waits before it acts itself. */
	readonly fallbackMinutes: number;
}

/**
 * What the system text is composed from (old `GamemakerPromptInput`).
 *
 * @public
 */
export interface GamemakerPromptInput {
	/** The city's name. */
	readonly city: string;
	/** The residents of the run. */
	readonly agents: number;
	/** The residents who remain at the end. */
	readonly survivors: number;
	/** The rules the text names. */
	readonly rules: GamemakerRules;
	/** The game's gamemaker spec. */
	readonly spec: GamemakerSpec;
	/** Whether the report carries the Confessor's labels. */
	readonly labels?: boolean;
	/** Whether the city holds tribunals the gamemaker plans; `factions` when each has a faction draft. */
	readonly tribunal?: { readonly factions: boolean };
	/** Whether the report shows the residents' core motives or secret goals. */
	readonly characters?: boolean;
	/** Whether the city auctions a black seal. */
	readonly seal?: boolean;
	/** How strongly the gamemaker steers; 4 when left out. */
	readonly direction?: DirectionLevel;
	/** The city's holdout tribunal, which the gamemaker calls and announces. */
	readonly holdout?: HoldoutTiming;
	/** Whether the report names a secret whisperer the gamemaker must never give away. */
	readonly whisperer?: boolean;
	/** Whether the report shows the whisperer's measured orders, so the gamemaker pushes him when he falls behind. */
	readonly whispererDuty?: boolean;
}

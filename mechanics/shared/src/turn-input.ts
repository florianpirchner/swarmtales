/**
 * The turn input of a resident, as the old engine builds it (`Arena#inputsFor`, `statusLine` in
 * packages/engine/src/turn-input.ts). FROZEN in wave 3.0: every mechanic that adds a line uses
 * these kinds, and every status part its `order`, so the parts land where the goldens have them
 * whatever the load order.
 */

/** The kinds of the turn input, in the old order; the story gives them as `turns.inputs`. */
export const INPUT_KINDS = [
	{ kind: "character" },
	{ kind: "status", join: " · " },
	{ kind: "task" },
	{ kind: "dm" },
	{ kind: "notice" },
	{ kind: "digest" },
] as const;

/**
 * The `order` of each part of the `status` line (`{ kind: "status", text, order }`), with the
 * mechanic that writes it. Gaps leave room; parts with the same order keep the load order.
 */
export const STATUS_ORDER = {
	/** progression: `minute N`. */
	minute: 100,
	/** progression: the level, open, closed, waiting or finished. */
	level: 200,
	/** ledger: `N points`. */
	points: 300,
	/** progression: the rank among the residents. */
	rank: 400,
	/** marks: what is left of them. */
	marks: 500,
	/** receipts: how many the resident holds. */
	receipts: 600,
	/** standoff: the pieces others wait for. */
	held: 700,
	/** progression: a code that awaits its confirmation. */
	awaitsCode: 800,
	/** exile: gone or at the gate (the first of the old `tribunalParts`). */
	standing: 900,
	/** tribunal: accused, due to vote, or the faction draft. */
	tribunal: 910,
	/** seal: the auction and the bearer. */
	seal: 1000,
	/** goals: the resident's goal. */
	goal: 1100,
	/** channels: the DM cap's window. */
	dmWindow: 1200,
	/** whispers: the popularity vote while it is open. */
	popularity: 1300,
	/** standoff-tribunal: the holdout session. */
	holdout: 1400,
	/** names: `you are <name>`. */
	youAre: 1500,
} as const;

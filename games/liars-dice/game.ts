// SPDX-License-Identifier: Apache-2.0
/**
 * Liar's dice: the traditional bluffing game with hidden dice for solo seats. A match is several games; in each game
 * every seat rolls its dice in secret every round, the seats bid higher in turn on how many dice of a face the whole
 * table holds, and one calls the last bid a lie; the call shows every die and the wrong side loses a die. The last
 * seat with dice wins. The rules are in the `liars-dice` mechanic; every die is rolled and every bid checked there.
 * Every game starts from a fresh context; the only memory across games is each seat's private strategy brain
 * (`brain: false`: the same briefings, no brain). Bids may carry public table talk (`talk: false`: none), so
 * bluffing has a voice. The mechanic scores every decision against a simple probability baseline for the report;
 * the seats never see it. A port of the old `stories/liars-dice/story.ts`: the variants are options of the factory,
 * the id is always `liars-dice`.
 */
import { SwtError } from "@swarmtales/contracts";
import { liarsDice } from "@swarmtales/mechanic-liars-dice";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, paramOverride } from "@swarmtales/sdk";
import { briefings, seatsOf } from "./briefing.ts";

/**
 * The variants of liar's dice.
 *
 * @public
 */
export interface LiarsDiceOptions {
	/** Players at the table: 4 (default); 2 to 6 work. */
	readonly seats?: number;
	/** Games in the match (default 3). */
	readonly games?: number;
	/** Dice per seat at the start of a game (default 4). */
	readonly dice?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Public table talk with bids and calls (default on). */
	readonly talk?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 53 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the dice (the match ends the run earlier). */
	readonly ticks?: number;
}

const DEADLINE = 2;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game. */
const DEFAULTS = { seats: 4, games: 3, dice: 4, brain: true, talk: true, maxWords: 150, seed: 53 } as const satisfies LiarsDiceOptions;
type Filled = LiarsDiceOptions & Required<Omit<LiarsDiceOptions, "ticks">>;

// An upper bound: a game has seats * dice - 1 rounds, a round rarely needs more than four ticks.
const ticksFor = ({ games, seats, dice }: Filled): number => games * (seats * dice - 1) * 4 + (games + 1) * RETRO_TICKS + 4;

// The two mechanics with the options of the old game, in its order.
function mechanicsOf({ games, dice, talk, brain, maxWords }: Filled, residents: readonly string[]) {
	const placePoints = residents.map((_, index) => residents.length - 1 - index);
	return [
		liarsDice({ games, dice, talk, placePoints, deadline: DEADLINE }),
		strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(residents.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	] as const;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `seats` is not an integer from 2 to 6.
 * @example
 * ```ts
 * const played = await play(liarsDiceGame({ seats: 2, talk: false }), { seed: 7 });
 * ```
 *
 * @public
 */
export function liarsDiceGame(options: LiarsDiceOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const { seats, brain } = filled;
	if (!Number.isInteger(seats) || seats < 2 || seats > 6) throw new SwtError(paramOverride({ name: "seats", problem: "mismatch", message: `must be an integer from 2 to 6, got ${String(seats)}` }));
	const residents = seatsOf(seats);
	return defineGame({
		id: "liars-dice",
		title: seats === 2 ? "Liar's dice heads-up" : "Liar's dice",
		seed: filled.seed,
		residents,
		mechanics: mechanicsOf(filled, residents),
		grants: { resident: ["viewTable", "bid", "liar", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["bid", "liar", ...(brain ? (["writeBrain"] as const) : [])],
		// Six passes a tick: one seat acts per pass; a seat may look at the table and act in each (14 calls). The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 6, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "liars-dice" }] } },
		limits: { maxCallsPerTick: 14 },
		end: { ticks: filled.ticks ?? ticksFor(filled) },
		win: { fact: "liars-dice.scores" },
		briefing: briefings(brain, seats, filled.talk),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

export default liarsDiceGame();

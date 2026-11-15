// SPDX-License-Identifier: Apache-2.0
/**
 * Hold'em: fixed-limit Texas Hold'em for solo seats, four-handed or heads-up. A match is several games of several
 * hands; every game starts from a fresh context, and the only memory across games is each seat's private strategy
 * brain, rewritten before the first game and after each game (`brain: false`: the same briefings, no brain). The
 * deals are duplicate: every game replays the same deals with the seats moved one place, so over as many games as
 * seats every seat plays every position's cards and the match totals are free of the deal's luck. The `holdem`
 * mechanic scores every decision against a simple equity baseline for the report; the seats never see it. A port of
 * the old `stories/holdem/story.ts`: the variants are options of the factory, the id is always `holdem`.
 */
import { SwtError } from "@swarmtales/contracts";
import { holdem } from "@swarmtales/mechanic-holdem";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, paramOverride } from "@swarmtales/sdk";
import { briefings, seatsOf } from "./briefing.ts";

/**
 * The variants of hold'em.
 *
 * @public
 */
export interface HoldemOptions {
	/** Players at the table: 4 (default) or 2 (heads-up); 2 to 6 work. */
	readonly seats?: number;
	/** Games in the match (default: one per seat, the full duplicate cycle). */
	readonly games?: number;
	/** Hands per game (default 8 four-handed, 12 heads-up). */
	readonly hands?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Replay the same deals in every game with the seats moved (default on). */
	readonly duplicate?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 41 when absent. */
	readonly seed?: number;
	/** Monte Carlo draws per scored decision (the report's baseline; tests use few); the mechanic's default when absent. */
	readonly equitySamples?: number;
	/** Run length in ticks; default is an upper bound from the hands (the match ends the run earlier). */
	readonly ticks?: number;
}

const DEADLINE = 2;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game; `games` and `hands` follow from the seats. */
const DEFAULTS = { seats: 4, brain: true, duplicate: true, maxWords: 150, seed: 41 } as const satisfies HoldemOptions;
type Filled = HoldemOptions & Required<Omit<HoldemOptions, "ticks" | "equitySamples">>;

// An upper bound: a hand rarely needs more than four ticks even with every deadline run out.
const ticksFor = ({ games, hands }: Filled): number => games * hands * 6 + (games + 1) * RETRO_TICKS + 4;

// The two mechanics with the options of the old game, in its order. The mixed tables and the aid plug in here (M4-40).
function mechanicsOf({ games, hands, duplicate, equitySamples, brain, maxWords }: Filled, residents: readonly string[]) {
	return [
		holdem({ games, hands, duplicate, deadline: DEADLINE, ...(equitySamples === undefined ? {} : { equitySamples }) }),
		strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(residents.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	] as const;
}

// The options with every default of the old game filled in.
function filledOf(options: HoldemOptions): Filled {
	const seats = options.seats ?? DEFAULTS.seats;
	return { ...DEFAULTS, games: seats, hands: seats === 2 ? 12 : 8, ...options };
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `seats` is not an integer from 2 to 6.
 * @example
 * ```ts
 * const played = await play(holdemGame({ seats: 2, brain: false }), { seed: 7 });
 * ```
 *
 * @public
 */
export function holdemGame(options: HoldemOptions = {}) {
	const filled = filledOf(options);
	const { seats, brain } = filled;
	if (!Number.isInteger(seats) || seats < 2 || seats > 6) throw new SwtError(paramOverride({ name: "seats", problem: "mismatch", message: `must be an integer from 2 to 6, got ${String(seats)}` }));
	const residents = seatsOf(seats);
	return defineGame({
		id: "holdem",
		title: seats === 2 ? "Hold'em heads-up" : "Hold'em",
		seed: filled.seed,
		residents,
		mechanics: mechanicsOf(filled, residents),
		grants: { resident: ["viewTable", "act", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["act", ...(brain ? (["writeBrain"] as const) : [])],
		// Six passes a tick: one seat acts per pass, so a tick carries up to six actions; a seat may look at the table and act in each (14 calls). The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 6, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "holdem" }] } },
		limits: { maxCallsPerTick: 14 },
		end: { ticks: filled.ticks ?? ticksFor(filled) },
		win: { fact: "holdem.scores" },
		briefing: briefings(brain, seats),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

export default holdemGame();

// SPDX-License-Identifier: Apache-2.0
/**
 * Hold'em: fixed-limit Texas Hold'em for solo seats, four-handed or heads-up. A match is several games of several
 * hands; every game starts from a fresh context, and the only memory across games is each seat's private strategy
 * brain, rewritten before the first game and after each game (`brain: false`: the same briefings, no brain). The
 * deals are duplicate: every game replays the same deals with the seats moved one place, so over as many games as
 * seats every seat plays every position's cards and the match totals are free of the deal's luck. The `holdem`
 * mechanic scores every decision against a simple equity baseline for the report; the seats never see it. A port of
 * the old `stories/holdem/story.ts`: the variants are options of the factory, the id is always `holdem`. The file
 * exports the game family: the variants that an experiment or `--set` may choose are its params, and its defaults give
 * the game of the old platform.
 */
import { SwtError } from "@swarmtales/contracts";
import { holdem } from "@swarmtales/mechanic-holdem";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, defineGameFamily, paramOverride } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
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
	/** Only these seats keep a brain (a mixed table: brain against no brain on the same duplicate cards); the others get the no-brain briefing. Needs `brain` on. */
	readonly brainSeats?: readonly string[];
	/** Replay the same deals in every game with the seats moved (default on). */
	readonly duplicate?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** The seed of the run; 41 when absent. */
	readonly seed?: number;
	/** Monte Carlo draws per scored decision (the report's baseline; tests use few); the mechanic's default when absent. */
	readonly equitySamples?: number;
	/** Decision-time aid (P430): these seats are told, on their turn, their equity against the opponents' action-narrowed ranges and the pot odds; the others play without it on the same duplicate cards. */
	readonly aidSeats?: readonly string[];
	/** Run length in ticks; default is an upper bound from the hands (the match ends the run earlier). */
	readonly ticks?: number;
}

const DEADLINE = 2;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game; `games` and `hands` follow from the seats. */
const DEFAULTS = { seats: 4, brain: true, duplicate: true, maxWords: 150, seed: 41 } as const satisfies HoldemOptions;
type Filled = HoldemOptions & Required<Omit<HoldemOptions, "ticks" | "equitySamples" | "brainSeats" | "aidSeats">>;

// An upper bound: a hand rarely needs more than four ticks even with every deadline run out.
const ticksFor = ({ games, hands }: Filled): number => games * hands * 6 + (games + 1) * RETRO_TICKS + 4;

// The two mechanics with the options of the old game, in its order, with the aid seats and the brain seats of a mixed table.
function mechanicsOf({ games, hands, duplicate, equitySamples, brain, maxWords, aidSeats }: Filled, residents: readonly string[], brainSeats: readonly string[] | undefined) {
	return [
		holdem({ games, hands, duplicate, deadline: DEADLINE, ...(equitySamples === undefined ? {} : { equitySamples }), ...(aidSeats === undefined ? {} : { aid: true, aidSeats: [...aidSeats] }) }),
		strategyBrain({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(residents.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true, ...(brainSeats === undefined ? {} : { brainTeams: [...brainSeats] }) }),
	] as const;
}

// Refuses a list of seats with a seat that is not at the table, as the old game did.
function checkSeats(name: string, listed: readonly string[] | undefined, residents: readonly string[]): void {
	const stranger = listed?.find((seat) => !residents.includes(seat));
	if (stranger !== undefined) throw new SwtError(paramOverride({ name, problem: "mismatch", message: `names the seat ${stranger}, which is not at the table (${residents.join(", ")})` }));
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
 * @throws SwtError `SWT-G041` when `seats` is not an integer from 2 to 6, or `brainSeats` or `aidSeats` names a seat that
 * is not at the table.
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
	// The old game ignored the brain seats of a table without a brain (and checked them only with the brain on).
	const brainSeats = brain ? filled.brainSeats : undefined;
	checkSeats("brainSeats", brainSeats, residents);
	checkSeats("aidSeats", filled.aidSeats, residents);
	return defineGame({
		id: "holdem",
		title: seats === 2 ? "Hold'em heads-up" : "Hold'em",
		seed: filled.seed,
		residents,
		mechanics: mechanicsOf(filled, residents, brainSeats),
		grants: { resident: ["viewTable", "act", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["act", ...(brain ? (["writeBrain"] as const) : [])],
		// Six passes a tick: one seat acts per pass, so a tick carries up to six actions; a seat may look at the table and act in each (14 calls). The reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 6, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "holdem" }] } },
		limits: { maxCallsPerTick: 14 },
		end: { ticks: filled.ticks ?? ticksFor(filled) },
		win: { fact: "holdem.scores" },
		briefing: briefings(brain, seats, filled.brainSeats),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose. `games` and `hands` follow
 * from the seats at 0, as the old game's defaults did; an empty `brainSeats` keeps a brain for every seat, an empty
 * `aidSeats` gives no aid. The seed, the equity draws and the tick count are no params: the seed is the run's, the
 * draws are a knob of the tests, and the tick count follows from the games and hands.
 */
const Params = Type.Object(
	{
		seats: Type.Integer({ minimum: 2, maximum: 6, default: DEFAULTS.seats, description: "Players at the table: 4, or 2 for heads-up." }),
		games: Type.Integer({ minimum: 0, maximum: 20, default: 0, description: "Games in the match; 0: one per seat, the full duplicate cycle." }),
		hands: Type.Integer({ minimum: 0, maximum: 100, default: 0, description: "Hands per game; 0: 8 four-handed, 12 heads-up." }),
		brain: Type.Boolean({ default: DEFAULTS.brain, description: "Each seat keeps a strategy brain; false is the control arm." }),
		brainSeats: Type.Array(Type.String(), { maxItems: 6, default: [], description: "A mixed table: only these seats keep a brain (needs `brain`); empty: every seat." }),
		aidSeats: Type.Array(Type.String(), { maxItems: 6, default: [], description: "The decision-time aid (P430) for these seats only; empty: no aid." }),
		duplicate: Type.Boolean({ default: DEFAULTS.duplicate, description: "Replay the same deals in every game with the seats moved." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
	},
	{ description: "The variants of hold'em." },
);

// The options of one param set: a 0 and an empty list leave the option to the game's default.
const optionsOf = ({ games, hands, brainSeats, aidSeats, ...rest }: Static<typeof Params>): HoldemOptions => ({
	...rest,
	...(games === 0 ? {} : { games }),
	...(hands === 0 ? {} : { hands }),
	...(brainSeats.length === 0 ? {} : { brainSeats }),
	...(aidSeats.length === 0 ? {} : { aidSeats }),
});

/**
 * Hold'em as a game family: the default params give the registry default of the old platform (four seats, four games
 * of eight duplicate hands, a brain per seat); `{ brain: false }` is the control arm, `seats: 2` heads-up,
 * `brainSeats` a mixed table and `aidSeats` the decision aid.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: holdemFamily, params: { brain: false, aidSeats: ["A01", "A03"] }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const holdemFamily = defineGameFamily(Params, (params) => holdemGame(optionsOf(params)));

export default holdemFamily;

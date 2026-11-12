/**
 * HOLD'EM (docs/ideas/game-roadmap.md §2.5): fixed-limit Texas Hold'em for solo seats, four-handed or
 * heads-up. A match is several games of several hands; every game starts from a fresh context, and the
 * only memory across games is each seat's private strategy brain, rewritten before the first game and
 * after each game (variant `brain: false`: the same briefings, no brain). The deals are duplicate: every
 * game replays the same deals with the seats moved one place, so over as many games as seats every seat
 * plays every position's cards and the match totals are free of the deal's luck. The `holdem` mechanic
 * scores every decision against a simple equity baseline for the report; the seats never see it.
 * A TypeScript `CoreStory`, played by the generic runner (`swt run --story holdem`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { holdem } from "@swarmtales/mechanic-holdem";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

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
	readonly brainSeats?: readonly ResidentId[];
	/** Replay the same deals in every game with the seats moved (default on). */
	readonly duplicate?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Monte Carlo draws per scored decision (the report's baseline; tests use few). */
	readonly equitySamples?: number;
	/** Decision-time aid (P430): these seats are told, on their turn, their equity against the opponents' action-narrowed ranges and the pot odds; the others play without it on the same duplicate cards. */
	readonly aidSeats?: readonly ResidentId[];
	/** Run length in virtual minutes; default is an upper bound from the hands (the match ends the run earlier). */
	readonly minutes?: number;
}

const DEADLINE = 2;
const RETRO_MINUTES = 2;
/** Output cap per call, as for the other core stories (P94). */
const OUTPUT_TOKENS = 16000;

function seatsOf(count: number): ResidentId[] {
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);
}

function storyName(seats: number, brain: boolean, mixed: boolean, aid: boolean): string {
	return `holdem${seats === 2 ? "-hu" : seats === 4 ? "" : `-${String(seats)}max`}${aid ? "-aid" : ""}${brain ? (mixed ? "-mixed" : "") : aid ? "-mixed" : "-nobrain"}`;
}

/** The story with its variants as options. */
export function holdemStory(options: HoldemOptions = {}) {
	const { seats = 4, brain = true, duplicate = true, maxWords = 150, seed = 41 } = options;
	if (seats < 2 || seats > 6) throw new Error("holdem story: 2 to 6 seats");
	const games = options.games ?? seats;
	const hands = options.hands ?? (seats === 2 ? 12 : 8);
	const residents = seatsOf(seats);
	const brainSeats = brain ? options.brainSeats : undefined;
	if (brainSeats?.some((seat) => !residents.includes(seat)) === true) throw new Error("holdem story: a brain seat is not at the table");
	const aidSeats = options.aidSeats;
	if (aidSeats?.some((seat) => !residents.includes(seat)) === true) throw new Error("holdem story: an aid seat is not at the table");
	// An upper bound: a hand rarely needs more than four minutes even with every deadline run out.
	const minutes = options.minutes ?? games * hands * 6 + (games + 1) * RETRO_MINUTES + 4;
	return defineCoreStory({
		id: storyName(seats, brain, brainSeats !== undefined, aidSeats !== undefined),
		seed,
		minutes,
		residents,
		mechanics: [
			holdem.with({ games, hands, duplicate, deadline: DEADLINE, ...(options.equitySamples === undefined ? {} : { equitySamples: options.equitySamples }), ...(aidSeats === undefined ? {} : { aid: true, aidSeats: [...aidSeats] }) }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(residents.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true, ...(brainSeats === undefined ? {} : { brainTeams: [...brainSeats] }) }),
		],
		grants: { resident: ["viewTable", "act", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["act", ...(brain ? (["writeBrain"] as const) : [])],
		// Six passes a minute: one seat acts per pass, so a minute carries up to six actions; a seat may look at the table and act in each (14 steps). The reset line comes first.
		turns: { passes: 6, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 14 },
	});
}

function briefing(brain: boolean, seats: number, brainSeats: readonly ResidentId[] | undefined) {
	return (resident: ResidentId): string => {
		const keeps = brain && (brainSeats === undefined || brainSeats.includes(resident));
		const others = seatsOf(seats)
			.filter((seat) => seat !== resident)
			.join(", ");
		const lines = [
			`You are ${resident}, a player at a poker table (the others: ${others}). The session is a match of several games of fixed-limit Texas Hold'em, each game a number of hands. Every point you win in any hand counts toward your score; the aim is the most points over the whole match. At the start of each game you are given the rules, and each game starts from a fresh mind.`,
			"When it is your turn you are told your cards, the board, the pot and what you may do; act with the act tool (fold, check, call, bet or raise) and a short reason, which the other players never see. viewTable shows the table at any time. When it is not your turn, end your turn. There is no table talk.",
		];
		if (keeps) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by (which hands to play from which position, when to bet, raise, call or fold, what you noticed about the other players), not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, four seats, brain on. */
export function holdemEntry(options: HoldemOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	const seats = options.seats ?? 4;
	return {
		title: seats === 2 ? "Hold'em heads-up" : "Hold'em",
		story: holdemStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
		briefing: briefing(brain, seats, options.brainSeats),
		fixedRoster: `the ${String(seats)} seats are fixed (A01-A${String(seats).padStart(2, "0")}); pick the table size by story name`,
	};
}

export default holdemEntry();

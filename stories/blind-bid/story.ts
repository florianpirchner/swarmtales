/**
 * BLIND BID: four solo seats bid on a series of lots with sealed bids and a purse per game. Each
 * game sells eight lots: pay-your-bid, pay-the-runner-up, and the unfamiliar pay-the-third-bid and
 * everyone-pays lots with private values, and shared-worth lots with one hidden worth and a noisy estimate
 * per seat (the winner's curse); a coin left at the end of a game is worth a quarter point. The rules of the
 * first smoke run are the `classic` variant.
 * A match is several games; each starts from a fresh context, a full purse and fresh lots, and the only
 * memory across games is each seat's private strategy brain (variant `brain: false`: the same briefings,
 * no brain). The `sealed-auction` mechanic scores each game against closed-form single-lot references
 * (equilibrium shading, truthful bidding, the curse-free ceiling) for the report; residents never see it.
 * A TypeScript `CoreStory`, played by the generic runner (`swt run --story blind-bid`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { sealedAuction, type LotKind } from "@swarmtales/mechanic-sealed-auction";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

export interface BlindBidOptions {
	/** Games of the match (default 3). */
	readonly games?: number;
	/** The kinds of each game's lots in order (default two of each kind, mixed). */
	readonly lots?: readonly LotKind[];
	/** Coins per seat and game (default 100: enough for two or three lots, not for all six). */
	readonly purse?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** The rules of the first smoke run (six lots of three known kinds, purse 100, error ±15, coins left worth nothing). */
	readonly classic?: boolean;
	readonly maxWords?: number;
	readonly seed?: number;
	readonly minutes?: number;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04"];
const DEADLINE = 2;
const RETRO_MINUTES = 2;

/** The first smoke run's lots (P160-P163): two each of pay-your-bid, pay-the-runner-up and shared-worth. */
export const CLASSIC_LOTS: readonly LotKind[] = ["first-price", "second-price", "common", "first-price", "common", "second-price"];

/**
 * The default since v2 (P161-P163): the known formats once each, the unfamiliar ones (third price, all-pay) and
 * the shared worth twice each, eight lots. With an error of ±25 four bidders show the curse more clearly than
 * eight bidders with ±15 (bot test: bidding 0.7 of the estimate loses on 31 against 15 percent of the lots won).
 */
export const DEFAULT_LOTS: readonly LotKind[] = ["first-price", "third-price", "common", "all-pay", "second-price", "common", "third-price", "all-pay"];

const CLASSIC = { lots: CLASSIC_LOTS, purse: 100, worthMin: 20, worthMax: 80, noise: 15, coinValue: 0 } as const;
const V2 = { lots: DEFAULT_LOTS, purse: 120, worthMin: 30, worthMax: 90, noise: 25, coinValue: 0.25 } as const;

/** An upper bound of the minutes: every lot runs to its deadline, every retro to its timeout. */
function minutesFor(games: number, lots: number): number {
	return games * lots * DEADLINE + (games + 1) * RETRO_MINUTES + 4;
}

export function blindBidStory(options: BlindBidOptions = {}) {
	const rules = options.classic === true ? CLASSIC : V2;
	const { games = 3, lots = rules.lots, purse = rules.purse, brain = true, maxWords = 150, seed = 31 } = options;
	return defineCoreStory({
		id: `blind-bid${options.classic === true ? "-classic" : ""}${brain ? "" : "-nobrain"}${games === 3 ? "" : `-g${String(games)}`}${seed === 31 ? "" : `-s${String(seed)}`}`,
		seed,
		minutes: options.minutes ?? minutesFor(games, lots.length),
		residents: [...SEATS],
		mechanics: [
			sealedAuction.with({ games, lots: [...lots], purse, deadline: DEADLINE, worthMin: rules.worthMin, worthMax: rules.worthMax, noise: rules.noise, coinValue: rules.coinValue }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewAuction", "bid", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["bid", ...(brain ? (["writeBrain"] as const) : [])],
		// Four passes a minute: a lot's bids and the next lot's opening fit in one minute; the reset line comes first.
		turns: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 6 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of four bidders at an auction house (the others: ${others}). The session is a match of several games; in each game a series of lots is sold one by one with sealed bids, and you hold a purse of coins for that game. Every point you earn in any game counts toward your score. At the start of each game you are given its rules, and each game starts from a fresh mind.`,
			"When a lot is open, bid with the bid tool (0 passes) and a short reason; viewAuction shows the rules, your value or estimate, your coins and the results so far. When you have nothing to bid on, end your turn.",
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to bid by, not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games of eight lots, brain on. */
export function blindBidEntry(options: BlindBidOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Blind Bid", story: blindBidStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brain), fixedRoster: "the four seats are fixed (A01-A04)" };
}

/** Variants by name: `blind-bid[-classic][-nobrain][-g<games>][-s<seed>]`, for example `blind-bid-nobrain-s37`. */
const NAME = /^blind-bid(-classic)?(-nobrain)?(?:-g(\d+))?(?:-s(\d+))?$/;

export function blindBidEntryByName(id: string): CoreStoryEntry | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const games = match[3] === undefined ? undefined : Number(match[3]);
	const seed = match[4] === undefined ? undefined : Number(match[4]);
	if (games !== undefined && (games < 1 || games > 20)) return undefined;
	return blindBidEntry({
		...(match[1] === "-classic" ? { classic: true } : {}),
		...(match[2] === "-nobrain" ? { brain: false } : {}),
		...(games === undefined ? {} : { games }),
		...(seed === undefined ? {} : { seed }),
	});
}

export default blindBidEntry();

/**
 * LIAR'S DICE (docs/ideas/game-roadmap.md §2.11): the traditional bluffing game with hidden dice for solo
 * seats. A match is several games; in each game every seat rolls its dice in secret every round, the
 * seats bid higher in turn on how many dice of a face the whole table holds, and one calls the last bid
 * a lie; the call shows every die and the wrong side loses a die. The last seat with dice wins. The rules
 * live in the `liars-dice` mechanic; every die is rolled and every bid checked server-side. Every game
 * starts from a fresh context; the only memory across games is each seat's private strategy brain
 * (variant `brain: false`: the same briefings, no brain). Bids may carry public table talk (variant
 * `talk: false`: none), so bluffing has a voice. The mechanic scores every decision against a simple
 * probability baseline for the report; the seats never see it. A TypeScript `CoreStory`, played by the
 * generic runner (`swt run --story liars-dice`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { liarsDice } from "@swarmtales/mechanic-liars-dice";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

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
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the dice (the match ends the run earlier). */
	readonly minutes?: number;
}

const DEADLINE = 2;
const RETRO_MINUTES = 2;
/** Output cap per call, as for the other core stories (P94). */
const OUTPUT_TOKENS = 16000;

function seatsOf(count: number): ResidentId[] {
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);
}

/** The story's name from its options, in the order `liarsDiceEntryByName` reads it. */
export function liarsDiceName(options: LiarsDiceOptions = {}): string {
	const { seats = 4, brain = true, talk = true } = options;
	const parts = ["liars-dice", seats === 4 ? "" : seats === 2 ? "-hu" : `-${String(seats)}p`, brain ? "" : "-nobrain", talk ? "" : "-quiet", options.games === undefined ? "" : `-g${String(options.games)}`, options.dice === undefined ? "" : `-d${String(options.dice)}`];
	return parts.join("");
}

/** The story with its variants as options. */
export function liarsDiceStory(options: LiarsDiceOptions = {}) {
	const { seats = 4, games = 3, dice = 4, brain = true, talk = true, maxWords = 150, seed = 53 } = options;
	if (seats < 2 || seats > 6) throw new Error("liars-dice story: 2 to 6 seats");
	const residents = seatsOf(seats);
	// An upper bound: a game has seats * dice - 1 rounds, a round rarely needs more than four minutes.
	const minutes = options.minutes ?? games * (seats * dice - 1) * 4 + (games + 1) * RETRO_MINUTES + 4;
	const placePoints = Array.from({ length: seats }, (_, index) => seats - 1 - index);
	return defineCoreStory({
		id: liarsDiceName(options),
		seed,
		minutes,
		residents,
		mechanics: [
			liarsDice.with({ games, dice, talk, placePoints, deadline: DEADLINE }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(residents.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewTable", "bid", "liar", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["bid", "liar", ...(brain ? (["writeBrain"] as const) : [])],
		// Six passes a minute: one seat acts per pass; a seat may look at the table and act in each (14 steps). The reset line comes first.
		turns: { passes: 6, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 14 },
	});
}

function briefing(brain: boolean, seats: number, talk: boolean) {
	return (resident: ResidentId): string => {
		const others = seatsOf(seats)
			.filter((seat) => seat !== resident)
			.join(", ");
		const lines = [
			`You are ${resident}, a player at a dice table (the others: ${others}, seated in that order round the table). The session is a match of several games of liar's dice. Every point you win in any game counts toward your score; the aim is the most points over the whole match. At the start of each game you are given the rules, and each game starts from a fresh mind.`,
			`When it is your turn you are told your dice, the standing bid and what you may do; act with bid or liar and a short reason, which the other players never see. ${talk ? "You may add a short public remark (say); the others read it, and it need not be true." : "There is no table talk."} viewTable shows the table at any time. When it is not your turn, end your turn.`,
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by (when to raise, when to call, how to bluff, what you noticed about the other players), not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, four seats, brain on. */
export function liarsDiceEntry(options: LiarsDiceOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	const seats = options.seats ?? 4;
	const talk = options.talk ?? true;
	return {
		title: seats === 2 ? "Liar's dice heads-up" : "Liar's dice",
		story: liarsDiceStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
		briefing: briefing(brain, seats, talk),
		fixedRoster: `the ${String(seats)} seats are fixed (A01-A${String(seats).padStart(2, "0")}); pick the table size by story name`,
	};
}

/** Combinations by name: `liars-dice[-hu|-<N>p][-nobrain][-quiet][-g<games>][-d<dice>]`, for example `liars-dice-hu-quiet-g2-d5`. */
const NAME = /^liars-dice(?:-(hu)|-([356])p)?(-nobrain)?(-quiet)?(?:-g(\d+))?(?:-d(\d+))?$/;

export function liarsDiceEntryByName(id: string): CoreStoryEntry | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const seats = match[1] === "hu" ? 2 : match[2] === undefined ? 4 : Number(match[2]);
	const games = match[5] === undefined ? undefined : Number(match[5]);
	const dice = match[6] === undefined ? undefined : Number(match[6]);
	if ((games !== undefined && (games < 1 || games > 20)) || (dice !== undefined && (dice < 1 || dice > 10))) return undefined;
	return liarsDiceEntry({
		seats,
		...(match[3] === "-nobrain" ? { brain: false } : {}),
		...(match[4] === "-quiet" ? { talk: false } : {}),
		...(games === undefined ? {} : { games }),
		...(dice === undefined ? {} : { dice }),
	});
}

export default liarsDiceEntry();

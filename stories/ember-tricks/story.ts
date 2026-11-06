/**
 * EMBER TRICKS (docs/ideas/game-roadmap.md §2.3): an original trick-taking game with exact bidding for
 * four solo seats. Five suits of different lengths (Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7,
 * Ember 1-6), rounds of 1 to 8 cards; every seat bids the exact number of tricks it will take, the
 * lowest bidder names the trump once every bid is public, a hit scores 10 + 3 per trick and a miss
 * costs the error squared. Each seat has one veto token per game to send a lead card back. Silent
 * table: no chat, the only signals are bids, the named trump and the cards. Every game (and every
 * round) starts from a fresh context; the only memory across games is each seat's own notes (the
 * strategy brain, a team of one). A TypeScript `CoreStory`, played by the generic runner
 * (`swt run --story ember-tricks`).
 */
import { fileURLToPath } from "node:url";
import type { Host, ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { trickPlay } from "@swarmtales/mechanic-trick-play";
import type { CoreStoryEntry } from "../index.ts";

export interface EmberTricksOptions {
	/** Games in the match; the run ends after the last one. */
	readonly games?: number;
	/** Cards per seat, round by round (default 1 to 8). */
	readonly rounds?: readonly number[];
	/** Each seat keeps notes across games; false is the control arm (same briefings, no notes, no retro). */
	readonly brain?: boolean;
	readonly seed?: number;
	/** Run length in virtual minutes; default scales with the games. */
	readonly minutes?: number;
	/** Words the notes may have. */
	readonly maxWords?: number;
}

const SEATS = ["A01", "A02", "A03", "A04"];
const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];
const DEFAULT_ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The registered name: `ember-tricks[-nobrain][-g<games>][-r<last round>]`, the defaults left out. */
function storyName(brain: boolean, games: number, rounds: readonly number[]): string {
	const plain = rounds.length === DEFAULT_ROUNDS.length && rounds.every((cards, index) => cards === DEFAULT_ROUNDS[index]);
	return `ember-tricks${brain ? "" : "-nobrain"}${games === 2 ? "" : `-g${String(games)}`}${plain ? "" : `-r${String(rounds.length)}`}`;
}

/** The story with its variants as options. */
export function emberTricksStory(options: EmberTricksOptions = {}) {
	const { games = 2, rounds = DEFAULT_ROUNDS, brain = true, seed = 23, maxWords = 150 } = options;
	return defineCoreStory({
		id: storyName(brain, games, rounds),
		seed,
		minutes: options.minutes ?? games * (rounds.length * 6 + 6) + 6,
		residents: [...SEATS],
		mechanics: [
			cardTable.with({ suits: SUITS, seats: SEATS }),
			trickPlay.with({ games, rounds: [...rounds], trump: "lowestBidderNames", vetoTokens: 1, scoring: { hit: 10, perTrick: 3, miss: "square" }, maxIdleMinutes: 3, maxConsecutiveForfeits: 24, briefEveryRound: true }),
			strategyBrain.with({ enabled: brain, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 1, retroMaxMinutes: 2, shared: false, brainAtStart: false, solo: true }),
		],
		grants: { resident: ["viewTable", "placeBid", "nameTrump", "playCard", "vetoLead", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["writeBrain"] : [],
		// The seat on turn has news; several seats act in one pass when the turn moves along the roster.
		turns: { passes: 8, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 8 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId, host: Host): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of four players (${others} are the others; ${String(host.residents.length)} residents in all) at a card table playing Ember Tricks, a trick-taking game with exact bidding. Every player plays for themselves. There is no chat: the only signals are bids, the named trump and the cards.`,
			"The deck has 40 cards in five suits of different lengths: Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7, Ember 1-6. A game has eight rounds; in round n everyone gets n cards. The dealer moves one seat on every round.",
			"Each round: 1) Bidding, starting left of the dealer: each player bids how many tricks they will take, exactly (placeBid). Bids are public. 2) The player with the lowest bid (the earliest on a tie) names the trump suit (nameTrump). 3) Tricks: the first bidder leads; everyone must follow the suit led if they can, otherwise any card (playCard). The highest trump wins the trick, otherwise the highest card of the suit led. The winner leads the next trick.",
			"Veto: once per game, right after a lead card and before you play, the player after the leader may spend the veto token (vetoLead): the lead card goes back and the leader must lead a different suit.",
			"Scoring per round: taking exactly your bid scores 10 + 3 per trick taken; a miss costs the square of the difference (bid 3, took 5: -4). The match has several games; the most points in a game wins it.",
			"When it is your turn the table status shows your hand, the bids, the trump, the trick and what you may do. Act with one tool call; viewTable shows the table again.",
		];
		if (brain) lines.push("You keep short notes across games (readBrain). After each game you rewrite them with writeBrain: rules that help you bid and play better next time, not a list of one game's cards.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, two games, notes on. */
export function emberTricksEntry(options: EmberTricksOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return {
		title: "Ember Tricks",
		story: emberTricksStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5" },
		briefing: briefing(brain),
		prompts: fileURLToPath(new URL("./prompts", import.meta.url)),
		fixedRoster: "the four residents are the four seats of the card table (A01-A04)",
	};
}

export default emberTricksEntry();

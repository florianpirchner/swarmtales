/**
 * SALT MARKET (docs/ideas/game-roadmap.md §2.7): four solo traders play a match of negotiation games.
 * In each game every trader holds a bundle of five goods, values them privately and has a secret
 * contract (a bundle that pays a bonus); the goods each one needs sit with the others. All goods move
 * through a bank that executes only offers both sides hold the goods for; later deliveries are plain
 * promises or escrowed for a fee; trades above a size pay a tax; one good spoils every round. The rules
 * are in the `salt-market` mechanic. Every game starts from a fresh context; the only memory across
 * games is each trader's private strategy brain (variant `brain: false`: the same briefings, no brain),
 * so the question is whether a trader learns a trading style (generous, tough, honest, deceptive) and
 * whether it pays. The mechanic scores every game against the optimal allocation, for the report only.
 * A TypeScript `CoreStory`, played by the generic runner (`swt run --story salt-market`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { saltMarket } from "@swarmtales/mechanic-salt-market";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

export interface SaltMarketOptions {
	/** Games in the match (default 2). */
	readonly games?: number;
	/** Trading rounds per game (default 6), one virtual minute each. */
	readonly rounds?: number;
	/** Each trader keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Goods spoil at the end of each round but the last (default on). */
	readonly spoil?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the rounds (the match ends the run earlier). */
	readonly minutes?: number;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04"];
const RETRO_MINUTES = 2;
const TOOLS = ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say"] as const;

/** An upper bound of the minutes: every round, every retro to its timeout, a start minute per game. */
function minutesFor(games: number, rounds: number): number {
	return games * (rounds + 1) + (games + 1) * RETRO_MINUTES + 4;
}

/** The story with its variants as options. */
export function saltMarketStory(options: SaltMarketOptions = {}) {
	const { games = 2, rounds = 6, brain = true, spoil = true, maxWords = 150, seed = 41 } = options;
	return defineCoreStory({
		id: `salt-market${brain ? "" : "-nobrain"}${spoil ? "" : "-nospoil"}`,
		seed,
		minutes: options.minutes ?? minutesFor(games, rounds),
		residents: [...SEATS],
		mechanics: [
			saltMarket.with({ games, rounds, spoil, roundMinutes: 1 }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: [...TOOLS, ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["writeBrain"] : [],
		// Three passes a round: make offers, answer them, close the deals; a trader with nothing new sits out a pass.
		turns: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 12 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of four traders at the salt market (the others: ${others}). The session is a match of trading games played one after another. In each game you hold goods, value them in secret and have a secret contract to fill; the rules come at the start of each game. Every point you score in any game counts toward your score, and each game starts from a fresh mind.`,
			"Each round you get a few turns. In a turn, read what is new, then trade: offer, accept, decline, withdraw, give or say; viewMarket shows everything you may see. When you are done for now, end your turn. What other traders tell you may be true or not; only the bank's book and its trades are certain.",
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to trade by, not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, two games of six rounds, brain on. */
export function saltMarketEntry(options: SaltMarketOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Salt Market", story: saltMarketStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brain), fixedRoster: "the four traders are fixed (A01-A04)" };
}

/** Variants by name: `salt-market[-nobrain][-nospoil][-g<games>][-r<rounds>]`, for example `salt-market-nobrain-g3-r8`. */
const NAME = /^salt-market(-nobrain)?(-nospoil)?(?:-g(\d+))?(?:-r(\d+))?$/;

export function saltMarketEntryByName(id: string): CoreStoryEntry | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const games = match[3] === undefined ? undefined : Number(match[3]);
	const rounds = match[4] === undefined ? undefined : Number(match[4]);
	if ((games !== undefined && (games < 1 || games > 20)) || (rounds !== undefined && (rounds < 2 || rounds > 20))) return undefined;
	return saltMarketEntry({
		...(match[1] === "-nobrain" ? { brain: false } : {}),
		...(match[2] === "-nospoil" ? { spoil: false } : {}),
		...(games === undefined ? {} : { games }),
		...(rounds === undefined ? {} : { rounds }),
	});
}

export default saltMarketEntry();

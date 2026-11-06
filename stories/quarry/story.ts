/**
 * QUARRY (docs/ideas/game-roadmap.md §2.4): four solo seats play a match of drafting games. In each
 * game every seat opens packs of cards, keeps one card per pick and passes the rest around the table;
 * at the end every quarry scores the square of each resource it holds, a bonus for strictly the most
 * of a resource, minus the burns it used to destroy cards a neighbour wanted. The original rules are in
 * the `draft-rounds` mechanic. Every game starts from a fresh context; the only memory across games is
 * each seat's private strategy brain (variant `brain: false`: the same briefings, no brain), so the
 * question is whether a seat learns to read what its neighbours pass and to stay out of their lanes.
 * The mechanic scores every pick against the greedy pick and every game against four greedy seats on
 * the same deal, for the report only. A TypeScript `CoreStory`, played by the generic runner
 * (`swt run --story quarry`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { draftRounds } from "@swarmtales/mechanic-draft-rounds";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

export interface QuarryOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** Pack rounds per game (default 2) and cards per pack (default 6). */
	readonly packs?: number;
	readonly packSize?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Every seat sees every quarry during the game (default off). */
	readonly openHands?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the picks (the match ends the run earlier). */
	readonly minutes?: number;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04"];
const DEADLINE = 2;
const RETRO_MINUTES = 2;

/** An upper bound of the minutes: every pick runs to its deadline, every retro to its timeout. */
function minutesFor(games: number, packs: number, packSize: number): number {
	return games * packs * packSize * DEADLINE + (games + 1) * RETRO_MINUTES + 4;
}

/** The story with its variants as options. */
export function quarryStory(options: QuarryOptions = {}) {
	const { games = 3, packs = 2, packSize = 6, brain = true, openHands = false, maxWords = 150, seed = 29 } = options;
	return defineCoreStory({
		id: `quarry${brain ? "" : "-nobrain"}${openHands ? "-open" : ""}`,
		seed,
		minutes: options.minutes ?? minutesFor(games, packs, packSize),
		residents: [...SEATS],
		mechanics: [
			draftRounds.with({ games, packs, packSize, openHands, deadline: DEADLINE }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewTable", "pick", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["pick", ...(brain ? (["writeBrain"] as const) : [])],
		// Four passes a minute: a pick and the next pick fit in one minute; the reset line comes first.
		turns: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 6 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of four players at a table (seated in the order A01, A02, A03, A04, then back to A01; the others: ${others}). The session is a match of drafting games played one after another. In each game you build a quarry by keeping one card from each pack that comes to you; the rules come at the start of each game. Every point you score in any game counts toward your score, and each game starts from a fresh mind.`,
			"When you are asked to pick, keep one card with pick and a short reason; viewTable shows the rules, your pack and your quarry. When you have nothing to pick, end your turn. There is no table talk: the only thing you learn about the others is what they pass you.",
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to draft by, not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function quarryEntry(options: QuarryOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Quarry", story: quarryStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brain), fixedRoster: "the four seats are fixed (A01-A04)" };
}

export default quarryEntry();

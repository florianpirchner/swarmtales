/**
 * ECON LAB (docs/ideas/game-roadmap.md §2.2): four solo seats play a match of three classic
 * experimental-economics games in neutral framing, one after another, each over several rounds: a
 * split offer (ultimatum), a shared fund (public goods) and an A-or-B choice (prisoner's dilemma).
 * Every game starts from a fresh context; the only memory across games is each seat's private strategy
 * brain, rewritten before the first game and after each game, so the question is whether a norm learned
 * in one game carries into the next (variant `brain: false`: the same briefings, no brain). The
 * `econ-games` mechanic scores each game against Nash play and the social optimum for the report;
 * residents never see it. A TypeScript `CoreStory`, played by the generic runner (`swt run --story econ-lab`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { econGames, type Block } from "@swarmtales/mechanic-econ-games";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

export interface EconLabOptions {
	/** The games of the match in order, with their rounds (default: split offer 6, shared fund 7, A-or-B 5; different lengths so a brain cannot learn the horizon of the next game). */
	readonly blocks?: readonly Block[];
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Tell the seats how many rounds a game has (default off: unknown horizon). */
	readonly showHorizon?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the rounds (the match ends the run earlier). */
	readonly minutes?: number;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04"];
const DEADLINE = 2;
const RETRO_MINUTES = 2;

export const DEFAULT_BLOCKS: readonly Block[] = [
	{ game: "ultimatum", rounds: 6 },
	{ game: "public-goods", rounds: 7 },
	{ game: "dilemma", rounds: 5 },
];

/** An upper bound of the minutes: every phase runs to its deadline, every retro to its timeout. */
function minutesFor(blocks: readonly Block[]): number {
	const rounds = blocks.reduce((sum, block) => sum + block.rounds * (block.game === "ultimatum" ? 2 : 1) * DEADLINE, 0);
	return rounds + (blocks.length + 1) * RETRO_MINUTES + 4;
}

const GAME_NAME: Readonly<Record<Block["game"], string>> = { "public-goods": "public-goods", ultimatum: "ultimatum", dilemma: "dilemma" };

function storyName(blocks: readonly Block[], brain: boolean): string {
	const single = blocks.length === 1 && blocks[0] !== undefined ? `-${GAME_NAME[blocks[0].game]}` : "";
	return `econ-lab${single}${brain ? "" : "-nobrain"}`;
}

/** The story with its variants as options. */
export function econLabStory(options: EconLabOptions = {}) {
	const { blocks = DEFAULT_BLOCKS, brain = true, showHorizon = false, maxWords = 150, seed = 23 } = options;
	return defineCoreStory({
		id: storyName(blocks, brain),
		seed,
		minutes: options.minutes ?? minutesFor(blocks),
		residents: [...SEATS],
		mechanics: [
			econGames.with({ blocks: blocks.map((block) => ({ ...block })), showHorizon, deadline: DEADLINE }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewTable", "contribute", "offer", "respond", "choose", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["contribute", "offer", "respond", "choose", ...(brain ? (["writeBrain"] as const) : [])],
		// Four passes a minute: a round's decisions and the next round's opening fit in one minute; the reset line comes first.
		turns: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 6 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of four participants at a table (the others: ${others}). The session is a match of games played one after another. Each game is a decision task with its own rules and several rounds; in every round you make one decision with the tool the round names. Every point you earn in any game counts toward your score. At the start of each game you are given its rules, and each game starts from a fresh mind.`,
			"When you are asked for a decision, make it with the named tool and a short reason; viewTable shows the rules, your task and your past rounds. When you have nothing to decide, end your turn.",
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by, not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, the three games, brain on. */
export function econLabEntry(options: EconLabOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Econ lab", story: econLabStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brain), fixedRoster: "the four seats are fixed (A01-A04)" };
}

export default econLabEntry();

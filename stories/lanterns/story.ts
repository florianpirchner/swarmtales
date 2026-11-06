/**
 * LANTERNS (docs/ideas/game-roadmap.md §2.9): two teams of three residents play a match of an original
 * word-clue game on a grid of 20 words. Each game one member of each team is its keeper (the role
 * rotates game by game) and sees which words belong to whom; the two others are seekers. On its turn
 * the keeper gives one clue word and a number and names, sealed for the report, the words it means;
 * the seekers take turns calling the guesses while the other advises in the team chat. The rules are
 * in the `clue-grid` mechanic. Every game starts from a fresh context; the only memory across games is
 * the team's strategy brain (variant `brain: false`: the same briefings, no brain), so the question is
 * whether a team builds conventions between keeper and seekers that survive a change of keeper. The
 * mechanic scores how much of what the keeper meant the seekers found, for the report only. A
 * TypeScript `CoreStory`, played by the generic runner (`swt run --story lanterns`).
 */
import type { Host, ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { clueGrid } from "@swarmtales/mechanic-clue-grid";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { CoreStoryEntry } from "../index.ts";

export interface LanternsOptions {
	/** Games in the match (default 3: every member keeps once). */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Clues per team and game. */
	readonly maxClues?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound (the match ends the run earlier). */
	readonly minutes?: number;
}

const DEFAULT_GAMES = 3;
const DEFAULT_CLUES = 8;
const DEADLINE = 2;
const RETRO_MINUTES = 3;
/** Output cap per call (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16_000;
const TEAMS = { amber: ["A01", "A02", "A03"], teal: ["A04", "A05", "A06"] };

/** The registered name: `lanterns[-nobrain][-g<games>][-c<clues>]`. */
function storyName(games: number, brain: boolean, maxClues: number): string {
	return `lanterns${brain ? "" : "-nobrain"}${games === DEFAULT_GAMES ? "" : `-g${String(games)}`}${maxClues === DEFAULT_CLUES ? "" : `-c${String(maxClues)}`}`;
}

/** An upper bound of the minutes: every clue turn runs to its deadline and every guess too, every retro to its timeout. */
function minutesFor(games: number, maxClues: number): number {
	return games * 2 * maxClues * DEADLINE * 3 + (games + 1) * RETRO_MINUTES + 4;
}

/** The story with its variants as options. */
export function lanternsStory(options: LanternsOptions = {}) {
	const { games = DEFAULT_GAMES, brain = true, maxClues = DEFAULT_CLUES, maxWords = 200, seed = 31 } = options;
	return defineCoreStory({
		id: storyName(games, brain, maxClues),
		seed,
		minutes: options.minutes ?? minutesFor(games, maxClues),
		residents: [...TEAMS.amber, ...TEAMS.teal],
		mechanics: [
			clueGrid.with({ games, maxClues, deadline: DEADLINE, teams: TEAMS }),
			teamChannel.with({ teams: TEAMS, maxPostsPerMove: 3 }),
			strategyBrain.with({ enabled: brain, maxWords, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["giveClue", "guess", "endGuesses", ...(brain ? (["writeBrain"] as const) : [])],
		// Five passes a minute: a clue, the partner's advice and a few guesses fit in one minute; the reset line comes first.
		turns: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		// A caller may view, read, post and make up to five guesses in one minute, and still write the brain if the game ends then.
		limits: { maxStepsPerMinute: 12 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId, host: Host): string => {
		const team = TEAMS.amber.includes(resident) ? "amber" : "teal";
		const mates = TEAMS[team].filter((id) => id !== resident).join(" and ");
		const lines = [
			`You are ${resident}, on team ${team} with ${mates}. Your team plays a word-clue game against the other team (${String(host.residents.length)} residents in all). A match has several games in a row; in each game one of you is the keeper, who sees which hidden word belongs to whom and gives the clues, and the two others are seekers, who reveal words from the clues. The keeper changes from game to game, and each game starts from a fresh mind: you are given the rules and your role at its start.`,
			"Your team has a private chat (postTeam, readTeam); the other team cannot read it. viewGrid shows the grid, the game so far and your task. A keeper gives a clue with giveClue; the caller of a clue reveals words with guess and may stop with endGuesses; the other seeker advises in the chat. Act only when you have a task; otherwise end your turn.",
		];
		if (brain) lines.push("Your team keeps a strategy brain: a short text (readBrain). Before the first game and after each game your team discusses in the chat and the retro captain rewrites it with writeBrain. Write rules and conventions that help the next keeper and the next seekers; do not copy a game's words or clues.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function lanternsEntry(options: LanternsOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return {
		title: "Lanterns",
		story: lanternsStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
		briefing: briefing(brain),
		fixedRoster: "the six residents are two fixed teams of three (amber: A01-A03, teal: A04-A06)",
	};
}

/** Lanterns combinations by name: `lanterns[-nobrain][-g<games>][-c<clues>]`, for example `lanterns-nobrain-g2`. */
const LANTERNS_NAME = /^lanterns(-nobrain)?(?:-g(\d+))?(?:-c(\d+))?$/;

export function lanternsEntryByName(id: string): CoreStoryEntry | undefined {
	const match = LANTERNS_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[2] === undefined ? undefined : Number(match[2]);
	const clues = match[3] === undefined ? undefined : Number(match[3]);
	if ((games !== undefined && (games < 1 || games > 20)) || (clues !== undefined && (clues < 1 || clues > 20))) return undefined;
	return lanternsEntry({ ...(match[1] === "-nobrain" ? { brain: false } : {}), ...(games === undefined ? {} : { games }), ...(clues === undefined ? {} : { maxClues: clues }) });
}

export default lanternsEntry();

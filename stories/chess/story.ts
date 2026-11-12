/**
 * CHESS (docs/ideas/game-roadmap.md §2.8): two solo seats play a match of chess games with
 * alternating colours. chess.js is the legality filter and the referee: a move is text, an illegal one
 * is refused and the board stays, and chess.js ends the game (mate, stalemate, repetition, fifty moves,
 * insufficient material); a move cap scores long games on material. Every game starts from a fresh
 * context; the only memory across games is each seat's private strategy brain (variant `brain: false`:
 * the same briefings without it). The material baseline scores every move for the report; the seats
 * never see it. A TypeScript `CoreStory`, played by the generic runner (`swt run --story chess`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { chess } from "@swarmtales/mechanic-chess";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { CoreStoryEntry } from "../index.ts";

export interface ChessOptions {
	/** Games in the match; the colours swap from game to game (A01 is White in game 1). */
	readonly games?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** The position shown to the seat on move lists every legal move (default off: the list comes only with a refused move). */
	readonly showLegalMoves?: boolean;
	/** The position lists each side's loose pieces (attacked and undefended, or attacked by a cheaper piece). */
	readonly showThreats?: boolean;
	/** Half-moves after which a game is scored on material. */
	readonly maxPlies?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the plies (the match ends the run earlier). */
	readonly minutes?: number;
	/** After each game a coach reviews each seat's worst moves by the material baseline, in private, for its next retro (needs the brain). */
	readonly coach?: boolean;
	/** Two teams of two (A: A01, A02; B: A03, A04) with a private chat; the captaincy rotates move by move, the other member advises. */
	readonly teams?: boolean;
	/** The seat on move starts every half-move from a fresh context (rules, brain, its last note, the position); default: once per game. */
	readonly fresh?: boolean;
	/** The compact board: a grid without spaces and only the last 12 half-moves. */
	readonly compact?: boolean;
	/** At the cap, settle the capture still open on the board before counting material (LH17). */
	readonly settleCap?: boolean;
}

const SEATS: readonly ResidentId[] = ["A01", "A02"];
const TEAMS: Readonly<Record<string, readonly ResidentId[]>> = { A: ["A01", "A02"], B: ["A03", "A04"] };
const PASSES = 4;
const IDLE_TURNS = 3;
const RETRO_MINUTES = 2;
/** Output cap per call, as in tic-tac-toe: a thinking model can spend 4000 tokens and end its turn without a move (P94). */
const OUTPUT_TOKENS = 16_000;

/** An upper bound of the minutes: every half-move takes all its idle turns, every retro its timeout. */
function minutesFor(games: number, maxPlies: number): number {
	return games * Math.ceil((maxPlies * IDLE_TURNS) / PASSES) + (games + 1) * RETRO_MINUTES + 4;
}

function storyName(options: ChessOptions): string {
	const parts = ["chess"];
	if (options.brain === false) parts.push("nobrain");
	if (options.showLegalMoves === true) parts.push("moves");
	if (options.showThreats === true) parts.push("threats");
	if (options.coach === true) parts.push("coach");
	if (options.teams === true) parts.push("teams");
	if (options.fresh === true) parts.push("fresh");
	if (options.compact === true) parts.push("compact");
	if (options.settleCap === true) parts.push("settle");
	if (options.games !== undefined && options.games !== DEFAULT_GAMES) parts.push(`g${String(options.games)}`);
	if (options.maxPlies !== undefined && options.maxPlies !== DEFAULT_PLIES) parts.push(`p${String(options.maxPlies)}`);
	return parts.join("-");
}

const DEFAULT_GAMES = 2;
const DEFAULT_PLIES = 160;

/** The story with its variants as options. */
export function chessStory(options: ChessOptions = {}) {
	const { games = DEFAULT_GAMES, brain = true, showLegalMoves = false, showThreats = false, maxPlies = DEFAULT_PLIES, maxWords = 150, seed = 29, teams = false, coach = false, fresh = false, compact = false, settleCap = false } = options;
	if (coach && !brain) throw new Error("chess: the coach reviews into the brain retro; a match without a brain has none");
	const sides = teams ? Object.fromEntries(Object.entries(TEAMS).map(([name, members]) => [name, [...members]])) : Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	return defineCoreStory({
		id: storyName(options),
		seed,
		// A team half-move takes one more pass: the advisor posts, then the captain plays.
		minutes: options.minutes ?? minutesFor(games, maxPlies) * (teams ? 2 : 1),
		residents: teams ? Object.values(TEAMS).flat() : [...SEATS],
		mechanics: [
			chess.with({ games, maxPlies, showLegalMoves, showThreats, coach, maxIdleTurns: IDLE_TURNS, maxForfeits: 3, adjudicateMargin: 3, alternateColours: true, score: true, teams: sides, wakeTeam: teams, freshContext: fresh, compactBoard: compact, settleCap }),
			// Solo seats have no team chat: the channel has no teams and nobody is granted its tools.
			teamChannel.with({ teams: teams ? sides : {}, maxPostsPerMove: 2 }),
			strategyBrain.with({ enabled: brain, solo: !teams, maxWords, teams: sides, retroMaxPosts: 6, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewBoard", "playMove", "resign", ...(teams ? (["postTeam", "readTeam"] as const) : []), ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["playMove", "resign", ...(brain ? (["writeBrain"] as const) : [])],
		// Only the seat on move has news, so a pass is one or two half-moves; the reset line comes first.
		turns: { passes: PASSES, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		// A turn may look at the board and retry a refused move a few times.
		limits: { maxStepsPerMinute: 16 },
	});
}

function briefing(brain: boolean, teams: boolean) {
	return (resident: ResidentId): string => {
		const team = Object.entries(TEAMS).find(([, members]) => members.includes(resident));
		const mate = team?.[1].find((member) => member !== resident) ?? "";
		const opponent = teams ? `team ${Object.keys(TEAMS).find((name) => name !== team?.[0]) ?? ""}` : (SEATS.find((seat) => seat !== resident) ?? "");
		const lines = teams
			? [
					`You are ${resident}. With ${mate} you are team ${team?.[0] ?? ""}; you play a match of chess games against ${opponent}. The colours swap from game to game. A win counts 1 point, a draw half a point. Each game starts from a fresh mind.`,
					`Your team plays one board. The captaincy rotates move by move between you and ${mate}: the captain of a move plays it with playMove, the other advises first in your private team chat (postTeam; readTeam shows it). The captain decides; advice is advice. An illegal move is refused and the board does not change; try another. Resign only in a lost position.`,
				]
			: [
					`You are ${resident}. You play a match of chess games against ${opponent}; the colours swap from game to game. A win counts 1 point, a draw half a point. Each game starts from a fresh mind.`,
					"When it is your move you are shown the position: play one legal move with playMove and end your turn. viewBoard shows the position again. An illegal move is refused and the board does not change; try another. Resign only in a lost position.",
				];
		if (brain && teams) lines.push("Your team keeps a strategy brain: a short private text (readBrain) that only your team reads. Before the first game and after each game the retro captain rewrites it with writeBrain, after a short talk in the team chat; it is the only thing your team carries from one game to the next. Write the principles you want to play by, not a list of the moves.");
		else if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the principles you want to play by, not a list of the moves.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, two games, brain on. */
export function chessEntry(options: ChessOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	const teams = options.teams ?? false;
	return {
		title: teams ? "Chess teams" : "Chess",
		story: chessStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
		briefing: briefing(brain, teams),
		fixedRoster: teams ? "two fixed teams of two (A: A01, A02; B: A03, A04)" : "the two seats are fixed (A01, A02)",
	};
}

/**
 * Chess variants by name: `chess[-nobrain][-moves][-threats][-coach][-teams][-fresh][-compact][-settle][-g<games>][-p<plies>]`,
 * for example `chess-nobrain-teams-g4-p120` (`-coach` needs the brain).
 */
const CHESS_NAME = /^chess(-nobrain)?(-moves)?(-threats)?(-coach)?(-teams)?(-fresh)?(-compact)?(-settle)?(?:-g(\d+))?(?:-p(\d+))?$/;

export function chessEntryByName(id: string): CoreStoryEntry | undefined {
	const match = CHESS_NAME.exec(id);
	if (match === null) return undefined;
	const games = match[9] === undefined ? undefined : Number(match[9]);
	const maxPlies = match[10] === undefined ? undefined : Number(match[10]);
	if (match[1] !== undefined && match[4] !== undefined) return undefined;
	if ((games !== undefined && (games < 1 || games > 20)) || (maxPlies !== undefined && (maxPlies < 2 || maxPlies > 400))) return undefined;
	return chessEntry({
		...(match[1] === undefined ? {} : { brain: false }),
		...(match[2] === undefined ? {} : { showLegalMoves: true }),
		...(match[3] === undefined ? {} : { showThreats: true }),
		...(match[4] === undefined ? {} : { coach: true }),
		...(match[5] === undefined ? {} : { teams: true }),
		...(match[6] === undefined ? {} : { fresh: true }),
		...(match[7] === undefined ? {} : { compact: true }),
		...(match[8] === undefined ? {} : { settleCap: true }),
		...(games === undefined ? {} : { games }),
		...(maxPlies === undefined ? {} : { maxPlies }),
	});
}

export default chessEntry();

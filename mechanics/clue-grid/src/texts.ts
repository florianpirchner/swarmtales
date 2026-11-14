// SPDX-License-Identifier: Apache-2.0
/** The texts of the `clue-grid` mechanic: the rules, a resident's role, its task and what `viewGrid` shows. */
import { cluesOf, isKeeper, keeper, limitOf, teamOf } from "./flow.ts";
import type { ClueGridCtx } from "./head.ts";
import { gridText, hiddenOf, other, paceLine, scoreGame, seekersOf, TEAMS, type ClueState, type TeamName } from "./model.ts";

/** Lines of the game record viewGrid shows. */
const RECORD_LINES = 14;

type Ctx = ClueGridCtx;

/**
 * The rules of a game, from the options.
 *
 * @param ctx - The mechanic's context.
 * @returns The prompt `clue-grid/rules`, filled.
 */
export function rulesText(ctx: Ctx): string {
	const o = ctx.options;
	return ctx.prompt("clue-grid/rules", {
		size: o.size,
		perTeam: o.perTeam,
		secondWords: o.perTeam - o.secondFewer,
		fog: o.size - 2 * o.perTeam + o.secondFewer - o.shadows,
		shadows: o.shadows,
		maxNumber: o.maxNumber,
		maxClues: o.maxClues,
		wordPoints: o.wordPoints,
		shadowPenalty: o.shadowPenalty,
		landedBonus: o.landedBonus,
		finishBonus: o.finishBonus,
		deadline: o.deadline,
		guessLimit: o.extraGuess ? "up to the number plus one guesses" : "up to as many guesses as the number",
	});
}

/**
 * What a resident is in the running game: keeper, seeker or a watcher.
 *
 * @param state - The mechanic's state.
 * @param resident - The resident.
 * @returns The sentence of the game's first briefing.
 */
export function roleLine(state: Readonly<ClueState>, resident: string): string {
	const team = teamOf(state, resident);
	if (team === undefined) return "You watch this game.";
	const keeperId = keeper(state, team);
	if (keeperId === resident) return `In this game you are the keeper of team ${team}: you see which word belongs to whom, you give your team's clues, and you may not post in the team chat until the game is over.`;
	const mates = seekersOf(state.teams[team], state.game).filter((id) => id !== resident);
	return `In this game you are a seeker of team ${team}; your keeper is ${keeperId}${mates.length === 0 ? "" : `, your fellow seeker ${mates.join(" and ")}`}. You see only the words; the seekers take turns calling the guesses for a clue, the other advises in the team chat.`;
}

function scoreLine(state: Readonly<ClueState>): string {
	const live = (team: TeamName): number => scoreGame(state.grid, state.clues, null, { wordPoints: 1, shadowPenalty: 0, landedBonus: 0, finishBonus: 0 })[team].words;
	return TEAMS.map((team) => `team ${team}: ${String(live(team))} of its words revealed, ${String(hiddenOf(state.grid, team).length)} hidden, ${String(cluesOf(state, team))} clues used`).join("; ");
}

/**
 * The task of `resident` now, or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The resident.
 * @returns The keeper's, the caller's or the advising seeker's task; undefined for a resident that owes nothing.
 */
export function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	if (!state.running) return undefined;
	const team = state.team;
	const columns = ctx.options.columns;
	if (state.phase === "clue" && resident === keeper(state, team)) {
		return ctx.prompt("clue-grid/task-clue", {
			team,
			clueNo: cluesOf(state, team) + 1,
			maxClues: ctx.options.maxClues,
			grid: gridText(state.grid, columns, true),
			own: hiddenOf(state.grid, team).join(", "),
			opponent: hiddenOf(state.grid, other(team)).join(", "),
			shadows: hiddenOf(state.grid, "shadow").join(", ") || "none left",
			maxNumber: Math.min(ctx.options.maxNumber, hiddenOf(state.grid, team).length),
			pace: paceLine(hiddenOf(state.grid, team).length, ctx.options.maxClues - cluesOf(state, team)),
		});
	}
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return undefined;
	const seekers = seekersOf(state.teams[clue.team], state.game);
	if (!seekers.includes(resident)) return undefined;
	const grid = gridText(state.grid, columns, false);
	if (resident === clue.caller) {
		const partner = seekers.filter((id) => id !== resident).join(" and ");
		return ctx.prompt("clue-grid/task-caller", { team: clue.team, word: clue.word, number: clue.number, keeper: clue.keeper, partner: partner === "" ? "nobody" : partner, grid, left: limitOf(ctx, clue) - clue.guesses.length });
	}
	return ctx.prompt("clue-grid/task-partner", { team: clue.team, word: clue.word, number: clue.number, keeper: clue.keeper, caller: clue.caller, grid });
}

// The resident's task in one line (the view already shows the grid).
function taskHint(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	if (state.phase === "clue" && resident === keeper(state, state.team)) return `Your task: give team ${state.team}'s clue with giveClue (word, number, targets). ${paceLine(hiddenOf(state.grid, state.team).length, ctx.options.maxClues - cluesOf(state, state.team))}`;
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return undefined;
	if (resident === clue.caller) return `Your task: call the guesses for "${clue.word}" ${String(clue.number)} with guess, or stop with endGuesses after at least one guess.`;
	if (seekersOf(state.teams[clue.team], state.game).includes(resident)) return `Your task: advise ${clue.caller} in the team chat (postTeam).`;
	return undefined;
}

// Whose turn it is, in one line.
function turnLine(ctx: Ctx): string {
	const state = ctx.state;
	if (state.phase === "clue") return `Team ${state.team} waits for a clue from its keeper ${keeper(state, state.team)}.`;
	return `Team ${state.team} guesses clue "${state.clue?.word ?? ""}" ${String(state.clue?.number ?? 0)}; caller ${state.clue?.caller ?? ""}, ${String(state.clue === null ? 0 : limitOf(ctx, state.clue) - state.clue.guesses.length)} guesses left.`;
}

/**
 * What `viewGrid` shows: the grid (with the key for a keeper), the turn, the game's record and the caller's task.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller, or undefined for a caller that is no resident.
 * @returns The reply of `viewGrid`.
 */
export function gridView(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	const totals = TEAMS.map((team) => `${team} ${String(state.scores[team] ?? 0)}`).join(", ");
	if (state.finished) return `The match is over. Points: ${totals}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over. Match points: ${totals}. The next game starts soon.`;
	const showKey = resident !== undefined && isKeeper(state, resident);
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}. Keepers: amber ${keeper(state, "amber")}, teal ${keeper(state, "teal")}. Match points before this game: ${totals}.`,
		showKey ? "The grid with the key (only keepers see the owners of hidden words):" : "The grid (revealed words show their owner in brackets):",
		gridText(state.grid, ctx.options.columns, showKey),
		`${scoreLine(state)}.`,
		turnLine(ctx),
	];
	const recent = state.log.slice(-RECORD_LINES);
	if (recent.length > 0) lines.push(`The game so far:\n${recent.join("\n")}`);
	const hint = resident === undefined ? undefined : taskHint(ctx, resident);
	if (hint !== undefined) lines.push(hint);
	return lines.join("\n");
}

// The task to show at this turn, noted as told: the keeper's and the caller's always, the advising seeker's once per clue.
function dueTask(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	const task = taskText(ctx, resident);
	const owes = (state.phase === "clue" && resident === keeper(state, state.team)) || resident === state.clue?.caller;
	if (task === undefined || (!owes && state.told.includes(resident))) return undefined;
	if (!state.told.includes(resident)) state.told.push(resident);
	return task;
}

/**
 * The lines of a resident's turn: the game's head with the rules once per game, the new lines of the record, and the
 * task. The keeper and the caller owe a move and see their task at every turn; the advising seeker once per clue.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The resident whose turn opens.
 * @returns The input lines, in order.
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	if (!state.running || teamOf(state, resident) === undefined) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("clue-grid/game-head", { game: state.game, games: ctx.options.games, starting: state.startingTeam, role: roleLine(state, resident) })} ${rulesText(ctx)}`);
	}
	const seen = state.seen[resident] ?? 0;
	if (state.log.length > seen) {
		lines.push(`The game so far (new):\n${state.log.slice(seen).join("\n")}`);
		state.seen[resident] = state.log.length;
	}
	const task = dueTask(ctx, resident);
	if (task !== undefined) lines.push(task);
	return lines;
}

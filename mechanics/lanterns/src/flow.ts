// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The flow of the `lanterns` mechanic: games, clue turns and guesses, the locks of the three move tools and the end of a game. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { ClueGridCtx } from "./head.ts";
import { clueProblem, dealGrid, hiddenOf, keeperOf, landedOf, normalizeWord, other, referenceOf, scoreGame, seekersOf, TEAMS, type ClueEnd, type ClueRecord, type ClueState, type GameResult, type ScoreRules, type TeamName } from "./model.ts";

const GIVE_CLUE = "giveClue";
const GUESS = "guess";
const END_GUESSES = "endGuesses";

type Ctx = ClueGridCtx;

const rulesOf = (ctx: Ctx): ScoreRules => ({ wordPoints: ctx.options.wordPoints, shadowPenalty: ctx.options.shadowPenalty, landedBonus: ctx.options.landedBonus, finishBonus: ctx.options.finishBonus });

/**
 * The team a resident plays in.
 *
 * @param state - The mechanic's state.
 * @param resident - A resident's id, or undefined for a caller that is no resident.
 * @returns The team, or undefined for nobody's member.
 */
export const teamOf = (state: Readonly<ClueState>, resident: string | undefined): TeamName | undefined => TEAMS.find((team) => resident !== undefined && state.teams[team].includes(resident));

/**
 * The keeper of a team in the running (or last) game.
 *
 * @param state - The mechanic's state.
 * @param team - The team.
 * @returns The keeper's id.
 */
export const keeper = (state: Readonly<ClueState>, team: TeamName): string => keeperOf(state.teams[team], state.game);

/**
 * How many guesses a clue allows.
 *
 * @param ctx - The mechanic's context.
 * @param clue - The clue.
 * @returns The clue's number, plus one with `extraGuess`.
 */
export const limitOf = (ctx: Ctx, clue: Readonly<ClueRecord>): number => clue.number + (ctx.options.extraGuess ? 1 : 0);

/**
 * Whether a resident is the keeper of its team in the running (or last) game.
 *
 * @param state - The mechanic's state.
 * @param resident - A resident's id.
 * @returns True for a keeper.
 */
export const isKeeper = (state: Readonly<ClueState>, resident: string): boolean => TEAMS.some((team) => keeper(state, team) === resident);

/**
 * The clues a team has used in the running game (a missed clue turn counts).
 *
 * @param state - The mechanic's state.
 * @param team - The team.
 * @returns The count.
 */
export const cluesOf = (state: Readonly<ClueState>, team: TeamName): number => state.clues.filter((clue) => clue.team === team).length;

function refreshLocks(ctx: Ctx): void {
	const state = ctx.state;
	const clueGiver = state.running && state.phase === "clue" ? keeper(state, state.team) : undefined;
	const caller = state.running && state.phase === "guess" ? state.clue?.caller : undefined;
	for (const resident of ctx.residents.ids) {
		if (resident === clueGiver) ctx.access.unlock(resident, GIVE_CLUE);
		else ctx.access.lock(resident, GIVE_CLUE);
		for (const tool of [GUESS, END_GUESSES]) {
			if (resident === caller) ctx.access.unlock(resident, tool);
			else ctx.access.lock(resident, tool);
		}
	}
}

// Adds a line to the game's public record.
function record(ctx: Ctx, line: string): void {
	ctx.state.log.push(line);
}

function openClue(ctx: Ctx, team: TeamName, tick: number): void {
	const state = ctx.state;
	state.team = team;
	state.phase = "clue";
	state.clue = null;
	state.opened = tick;
	state.told = [];
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	const rng = ctx.rng("clue-grid", "grid", game);
	state.startingTeam = game % 2 === 1 ? "amber" : "teal";
	const second = ctx.options.perTeam - ctx.options.secondFewer;
	const words = state.startingTeam === "amber" ? { amber: ctx.options.perTeam, teal: second } : { amber: second, teal: ctx.options.perTeam };
	state.grid = dealGrid({ size: ctx.options.size, ...words, shadows: ctx.options.shadows }, (items) => rng.shuffle(items));
	state.clues = [];
	state.log = [];
	state.seen = {};
	state.briefed = [];
	state.running = true;
	ctx.emit("clue_game_started", { game, startingTeam: state.startingTeam, keepers: { amber: keeper(state, "amber"), teal: keeper(state, "teal") }, words: state.grid.map((card) => card.word) });
	ctx.emit("clue_key_dealt", { game, key: state.grid.map((card) => ({ ...card })) });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: state.startingTeam });
	// A new game, a new chat: the teams' channels show nothing of the games before.
	for (const team of TEAMS) {
		ctx.tryCall(TeamChannelService, "newEpoch", { team });
		ctx.tryCall(TeamChannelService, "resetCap", { team });
	}
	openClue(ctx, state.startingTeam, ctx.tick);
}

/**
 * Starts the next game, or marks it due when the strategy brain holds it back.
 *
 * @param ctx - The mechanic's context.
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

// A clue in one line: `amber "river" 2: bank (amber), cloud (fog)`.
function clueLine(clue: Readonly<ClueRecord>): string {
	if (clue.word === "") return `${clue.team} gave no clue`;
	const guesses = clue.guesses.map((guess) => `${guess.word} (${guess.owner})`).join(", ");
	return `${clue.team} "${clue.word}" ${String(clue.number)}: ${guesses === "" ? "no guess" : guesses}`;
}

// The game's public result in one line, for the next briefing.
function summaryOf(result: Readonly<GameResult>, clues: readonly ClueRecord[]): string {
	const points = TEAMS.map((team) => `${team} ${String(result.scores[team]?.total ?? 0)}`).join(", ");
	const outcome = result.winner === "draw" ? "a draw" : `${result.winner} won`;
	const end = result.reason === "finished" ? `${TEAMS.find((team) => result.scores[team]?.finished === true) ?? ""} had all its words revealed first` : "both teams used their clues";
	return `points ${points} (${outcome}; ${end}); clues ${clues.map(clueLine).join("; ")}`;
}

function endGame(ctx: Ctx, reason: "finished" | "clues"): void {
	const state = ctx.state;
	const finisher = TEAMS.find((team) => hiddenOf(state.grid, team).length === 0) ?? null;
	const scores = scoreGame(state.grid, state.clues, finisher, rulesOf(ctx));
	const winner = scores.amber.total === scores.teal.total ? "draw" : scores.amber.total > scores.teal.total ? "amber" : "teal";
	const result: GameResult = { game: state.game, scores: { amber: scores.amber, teal: scores.teal }, winner, reason };
	for (const team of TEAMS) state.scores[team] = (state.scores[team] ?? 0) + scores[team].total;
	state.results.push(result);
	state.running = false;
	state.phase = "idle";
	state.clue = null;
	refreshLocks(ctx);
	ctx.emit("clue_game_ended", { game: state.game, result, totals: { ...state.scores }, key: state.grid.map((card) => ({ ...card })) });
	ctx.emit("clue_game_scored", { game: state.game, reference: { amber: referenceOf("amber", state.clues), teal: referenceOf("teal", state.clues) } });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: summaryOf(result, state.clues) });
	if (last) ctx.emit("clue_match_ended", { scores: { ...state.scores }, results: structuredClone(state.results) });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

const CLOSE: Readonly<Record<ClueEnd, string>> = {
	wrong: "the turn ends on a wrong word",
	stopped: "the seekers stopped",
	limit: "no guesses left",
	timeout: "the caller ran out of time",
	finished: "all words of a team are revealed",
	"no-clue": "the keeper gave no clue in time; the turn is lost",
};

/**
 * Closes the clue on turn (or a missed clue turn) and hands the turn on, or ends the game.
 *
 * @param ctx - The mechanic's context.
 * @param clue - The clue's record; a blank one for a missed clue turn.
 * @param end - Why the clue closes.
 * @param tick - The tick the next clue turn counts its deadline from.
 */
export function closeClue(ctx: Ctx, clue: ClueRecord, end: ClueEnd, tick: number): void {
	const state = ctx.state;
	clue.end = end;
	clue.landed = landedOf(clue);
	state.clues.push(clue);
	state.clue = null;
	ctx.emit("clue_closed", structuredClone(clue));
	record(ctx, `${clue.team} clue ${String(clue.clueNo)} closed: ${CLOSE[end]}${clue.landed ? " (landed: bonus)" : ""}.`);
	if (end === "finished") {
		endGame(ctx, "finished");
		return;
	}
	const max = ctx.options.maxClues;
	if (cluesOf(state, "amber") >= max && cluesOf(state, "teal") >= max) {
		endGame(ctx, "clues");
		return;
	}
	const next = cluesOf(state, other(clue.team)) < max ? other(clue.team) : clue.team;
	openClue(ctx, next, tick);
}

/**
 * A blank clue record of the team on turn: its keeper, its caller (the seekers take turns, one clue each).
 *
 * @param state - The mechanic's state.
 * @param word - The clue word, or '' for a missed clue turn.
 * @param number - The clue's number.
 * @param targets - The words the keeper means.
 * @returns The record, with no guess and no end.
 */
export function newClue(state: Readonly<ClueState>, word: string, number: number, targets: readonly string[]): ClueRecord {
	const team = state.team;
	const clueNo = cluesOf(state, team) + 1;
	const seekers = seekersOf(state.teams[team], state.game);
	return { game: state.game, team, keeper: keeper(state, team), caller: seekers[(clueNo - 1) % seekers.length] ?? "", clueNo, word, number, targets: [...targets], guesses: [], end: null, landed: false };
}

// Why the targets do not fit the clue's number or the team's hidden words, or undefined.
function targetsRefusal(own: readonly string[], number: number, targets: readonly string[]): Refusal | undefined {
	const named = targets.map(normalizeWord);
	if (named.length !== number || new Set(named).size !== named.length) return refuse("BAD_TARGETS", `Name exactly ${String(number)} different words you mean (targets); they stay secret.`);
	const stranger = named.find((target) => !own.includes(target));
	if (stranger !== undefined) return refuse("BAD_TARGETS", `"${stranger}" is not one of your team's hidden words: ${own.join(", ")}.`);
	return undefined;
}

/**
 * Why `resident` may not give this clue now, or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller.
 * @param word - The clue word.
 * @param number - The clue's number.
 * @param targets - The words the keeper means.
 * @returns The refusal, or undefined when the clue may be given.
 */
export function clueRefusal(ctx: Ctx, resident: string | undefined, word: string, number: number, targets: readonly string[]): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (state.phase !== "clue" || resident !== keeper(state, state.team)) return refuse("NOT_YOUR_CLUE", `Only the keeper of the team on turn (${keeper(state, state.team)}, team ${state.team}) may give a clue now.`);
	const problem = clueProblem(word, state.grid);
	if (problem !== undefined) return refuse("BAD_CLUE", problem);
	const own = hiddenOf(state.grid, state.team);
	const most = Math.min(ctx.options.maxNumber, own.length);
	if (number < 1 || number > most) return refuse("BAD_NUMBER", `The number must be from 1 to ${String(most)}.`);
	return targetsRefusal(own, number, targets);
}

/**
 * Gives the clue of the team on turn and opens the guesses of its caller.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller.
 * @param word - The clue word.
 * @param number - The clue's number.
 * @param targets - The words the keeper means.
 * @param reason - The keeper's reason, for the record.
 * @returns The reply, or the refusal of `clueRefusal`.
 */
export function giveClue(ctx: Ctx, resident: string | undefined, word: string, number: number, targets: readonly string[], reason: string): ToolSuccess | Refusal {
	const refusal = clueRefusal(ctx, resident, word, number, targets);
	if (refusal !== undefined) return refusal;
	const state = ctx.state;
	const clue = newClue(state, normalizeWord(word), number, targets.map(normalizeWord));
	state.clue = clue;
	state.phase = "guess";
	state.opened = ctx.tick;
	state.told = [];
	ctx.emit("clue_given", { game: clue.game, team: clue.team, keeper: clue.keeper, caller: clue.caller, clueNo: clue.clueNo, word: clue.word, number: clue.number });
	ctx.emit("clue_intent", { game: clue.game, team: clue.team, clueNo: clue.clueNo, targets: [...clue.targets], reason });
	record(ctx, `${clue.team} clue ${String(clue.clueNo)} from keeper ${clue.keeper}: "${clue.word}" ${String(clue.number)} (caller ${clue.caller}).`);
	ctx.tryCall(TeamChannelService, "resetCap", { team: clue.team });
	refreshLocks(ctx);
	return reply(`Clue "${clue.word}" ${String(clue.number)} given. ${clue.caller} calls the guesses; you may not post in the team chat during the game. Wait for your next clue turn.`);
}

/**
 * Why `resident` may not guess (or stop) now, or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller.
 * @returns The refusal, or undefined for the caller of the clue being guessed.
 */
export function guessRefusal(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return refuse("NO_CLUE", `No clue is being guessed; team ${state.team} waits for its keeper.`);
	if (resident !== clue.caller) return refuse("NOT_CALLER", `Only the caller of this clue (${clue.caller}, team ${clue.team}) may guess or stop.`);
	return undefined;
}

/**
 * Reveals one word for the caller of the clue and closes the clue when the word ends it.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller.
 * @param word - The word to reveal.
 * @returns The reply, or a refusal.
 */
export function guess(ctx: Ctx, resident: string | undefined, word: string): ToolSuccess | Refusal {
	const refusal = guessRefusal(ctx, resident);
	if (refusal !== undefined) return refusal;
	const state = ctx.state;
	const clue = state.clue;
	if (clue === null) return refuse("NO_CLUE", "No clue is being guessed.");
	const wanted = normalizeWord(word);
	const card = state.grid.find((other) => other.word === wanted);
	if (card === undefined) return refuse("NOT_ON_GRID", `"${word}" is not on the grid.`);
	if (card.revealed) return refuse("ALREADY_REVEALED", `"${card.word}" is already revealed (${card.owner}).`);
	card.revealed = true;
	card.by = clue.team;
	const target = clue.targets.includes(card.word);
	clue.guesses.push({ word: card.word, owner: card.owner, by: clue.caller, target });
	ctx.emit("clue_word_revealed", { game: clue.game, team: clue.team, by: clue.caller, clueNo: clue.clueNo, word: card.word, owner: card.owner, target, guessNo: clue.guesses.length });
	record(ctx, `${clue.caller} (${clue.team}) revealed "${card.word}": ${card.owner}.`);
	const finished = TEAMS.some((team) => hiddenOf(state.grid, team).length === 0);
	if (finished) {
		closeClue(ctx, clue, "finished", ctx.tick);
		return reply(`"${card.word}" is ${card.owner}. Every word of a team is revealed: the game is over.`);
	}
	if (card.owner !== clue.team) {
		closeClue(ctx, clue, "wrong", ctx.tick);
		const what = card.owner === "shadow" ? `a shadow (your team loses ${String(ctx.options.shadowPenalty)} points)` : card.owner === "fog" ? "fog" : `a word of team ${card.owner}`;
		return reply(`"${card.word}" is ${what}. Your turn is over.`);
	}
	const left = limitOf(ctx, clue) - clue.guesses.length;
	if (left <= 0) {
		closeClue(ctx, clue, "limit", ctx.tick);
		return reply(`"${card.word}" is yours. That was the last guess for this clue; your turn is over.`);
	}
	state.opened = ctx.tick;
	return reply(`"${card.word}" is yours. You may guess again (${String(left)} left for this clue) or stop with endGuesses.`);
}

/**
 * Stops the guesses of the clue for its caller.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller.
 * @returns The reply, or a refusal.
 */
export function endGuesses(ctx: Ctx, resident: string | undefined): ToolSuccess | Refusal {
	const refusal = guessRefusal(ctx, resident);
	if (refusal !== undefined) return refusal;
	const clue = ctx.state.clue;
	if (clue === null) return refuse("NO_CLUE", "No clue is being guessed.");
	if (clue.guesses.length === 0) return refuse("GUESS_FIRST", "Make at least one guess for a clue before you stop.");
	closeClue(ctx, clue, "stopped", ctx.tick);
	return reply("You stopped. The turn goes to the other team.");
}

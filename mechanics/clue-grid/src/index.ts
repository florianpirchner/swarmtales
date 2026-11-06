/**
 * The `clue-grid` mechanic: the word-clue game Lanterns (docs/ideas/game-roadmap.md §2.9) for two teams.
 * A grid of words is dealt; each word secretly belongs to team amber, team teal, the fog (nobody) or the
 * shadows (a penalty). Each game one member of a team is its keeper (the role rotates game by game) and
 * sees the key; the others are seekers and see only the words. Teams take turns: the keeper gives one
 * clue (`giveClue`: one word, a number, and the words it means, sealed for the report), then the caller
 * of the clue (the seekers take turns) reveals words one at a time (`guess`) while the other seeker
 * advises in the team chat. An own word lets the caller go on, up to number + 1 guesses; a fog word, an
 * opponent's word or a shadow ends the turn. Scoring (original, not a recreation of any published word
 * game): a point per own word revealed (whoever reveals it), minus a penalty per shadow a team reveals, a
 * bonus per landed clue (number of 2 or more, and its first `number` guesses were all own words), and a
 * bonus for the team whose words are all revealed first, which ends the game; otherwise the game ends
 * when both teams used their clues. A keeper may not post in the team chat during a game. The keeper's
 * targets make the report's measure (`clue_game_scored`, audience human): how much of what the keeper
 * meant the seekers found. A strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import {
	Card,
	ClueRecord,
	ClueSlice,
	clueProblem,
	copyState,
	dealGrid,
	GameResult,
	gridText,
	hiddenOf,
	keeperOf,
	landedOf,
	normalizeWord,
	other,
	referenceOf,
	scoreGame,
	seekersOf,
	TeamName,
	TeamReference,
	TEAMS,
	type ClueEnd,
	type ClueState,
	type ScoreRules,
} from "./model.ts";


const GIVE_CLUE = "giveClue";
const GUESS = "guess";
const END_GUESSES = "endGuesses";
const TEAM_POST = "postTeam";
/** Lines of the game record viewGrid shows. */
const RECORD_LINES = 14;

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the run ends after the last. The keeper rotates through each team's members, one game each." }),
	size: Type.Integer({ minimum: 8, maximum: 40, default: 20, description: "Words on the grid." }),
	columns: Type.Integer({ minimum: 2, maximum: 8, default: 5, description: "Words per row when the grid is shown." }),
	perTeam: Type.Integer({ minimum: 2, default: 6, description: "Words of each team." }),
	shadows: Type.Integer({ minimum: 0, default: 2, description: "Shadow words; the rest is fog." }),
	maxNumber: Type.Integer({ minimum: 1, default: 4, description: "The highest number a clue may carry." }),
	maxClues: Type.Integer({ minimum: 1, default: 8, description: "Clues per team and game; the game ends when both teams used theirs." }),
	wordPoints: Type.Integer({ minimum: 0, default: 1, description: "Points per own word revealed, whoever reveals it." }),
	shadowPenalty: Type.Integer({ minimum: 0, default: 3, description: "Points a team loses per shadow it reveals." }),
	landedBonus: Type.Integer({ minimum: 0, default: 1, description: "Points per landed clue (number 2 or more, its first `number` guesses all own words)." }),
	finishBonus: Type.Integer({ minimum: 0, default: 3, description: "Points for the team whose words are all revealed first (it ends the game)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a clue or the next guess stays open; a missing clue loses the turn, a missing guess ends it." }),
	teams: Type.Optional(
		Type.Object(
			{
				amber: Type.Array(Type.String(), { minItems: 2, description: "Resident ids of team amber, in the order the keeper role rotates." }),
				teal: Type.Array(Type.String(), { minItems: 2, description: "Resident ids of team teal, in the order the keeper role rotates." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half amber." },
		),
	),
});

const head = defineHead({
	id: "clue-grid",
	summary: "The word-clue game Lanterns for two teams: a keeper gives one-word clues, the seekers reveal words on a grid of hidden owners.",
	options,
	state: (setup): ClueState => {
		const half = Math.ceil(setup.residents.length / 2);
		const chosen = setup.options.teams ?? { amber: setup.residents.slice(0, half), teal: setup.residents.slice(half) };
		const members = [...chosen.amber, ...chosen.teal];
		if (chosen.amber.length < 2 || chosen.teal.length < 2) throw new Error("clue-grid: each team needs a keeper and at least one seeker");
		if (new Set(members).size !== members.length) throw new Error("clue-grid: a resident may play in one team only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new Error(`clue-grid: ${unknown} is not a resident of the run`);
		const { size, perTeam, shadows } = setup.options;
		if (2 * perTeam + shadows > size) throw new Error(`clue-grid: ${String(size)} words do not hold ${String(perTeam)} per team and ${String(shadows)} shadows`);
		return {
			teams: { amber: [...chosen.amber], teal: [...chosen.teal] },
			game: 0,
			grid: [],
			startingTeam: "amber",
			team: "amber",
			phase: "idle",
			clue: null,
			clues: [],
			opened: 0,
			log: [],
			seen: {},
			told: [],
			briefed: [],
			scores: { amber: 0, teal: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: {
		clue_game_started: Type.Object({
			game: Type.Integer(),
			startingTeam: TeamName,
			keepers: Type.Object({ amber: Type.String(), teal: Type.String() }),
			words: Type.Array(Type.String(), { description: "The grid, row by row." }),
		}),
		clue_key_dealt: Type.Object({ game: Type.Integer(), key: Type.Array(Card, { description: "Every word with its owner (sealed: audience human)." }) }),
		clue_given: Type.Object({ game: Type.Integer(), team: TeamName, keeper: Type.String(), caller: Type.String(), clueNo: Type.Integer(), word: Type.String(), number: Type.Integer() }),
		clue_intent: Type.Object({ game: Type.Integer(), team: TeamName, clueNo: Type.Integer(), targets: Type.Array(Type.String()), reason: Type.String() }),
		clue_word_revealed: Type.Object({ game: Type.Integer(), team: TeamName, by: Type.String(), clueNo: Type.Integer(), word: Type.String(), owner: Type.String(), target: Type.Boolean(), guessNo: Type.Integer() }),
		clue_closed: ClueRecord,
		clue_game_ended: Type.Object({
			game: Type.Integer(),
			result: GameResult,
			totals: Type.Record(Type.String(), Type.Number()),
			key: Type.Array(Card),
		}),
		clue_game_scored: Type.Object({ game: Type.Integer(), reference: Type.Object({ amber: TeamReference, teal: TeamReference }) }),
		clue_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()), results: Type.Array(GameResult) }),
	},
	// Sealed: the key, the keeper's targets and reasons, the full clue records (they carry the targets) and the reference.
	audiences: { clue_key_dealt: ["human"], clue_intent: ["human"], clue_closed: ["human"], clue_game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi, TeamChannelApi],
	prompts: {
		"clue-grid/tools/viewGrid": [],
		"clue-grid/tools/giveClue": [],
		"clue-grid/tools/guess": [],
		"clue-grid/tools/endGuesses": [],
		"clue-grid/rules": ["size", "perTeam", "fog", "shadows", "maxNumber", "maxClues", "wordPoints", "shadowPenalty", "landedBonus", "finishBonus", "deadline"],
		"clue-grid/game-head": ["game", "games", "starting", "role"],
		"clue-grid/task-clue": ["team", "clueNo", "maxClues", "grid", "own", "opponent", "shadows", "maxNumber"],
		"clue-grid/task-caller": ["team", "word", "number", "keeper", "partner", "grid", "left"],
		"clue-grid/task-partner": ["team", "word", "number", "keeper", "caller", "grid"],
		"clue-grid/keeper-silent": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): ScoreRules => ({ wordPoints: ctx.options.wordPoints, shadowPenalty: ctx.options.shadowPenalty, landedBonus: ctx.options.landedBonus, finishBonus: ctx.options.finishBonus });

const teamOf = (state: Readonly<ClueState>, resident: string | undefined): TeamName | undefined => TEAMS.find((team) => resident !== undefined && state.teams[team].includes(resident));

const keeper = (state: Readonly<ClueState>, team: TeamName): string => keeperOf(state.teams[team], state.game);

const isKeeper = (state: Readonly<ClueState>, resident: string): boolean => TEAMS.some((team) => keeper(state, team) === resident);

const cluesOf = (state: Readonly<ClueState>, team: TeamName): number => state.clues.filter((clue) => clue.team === team).length;

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

/** Adds a line to the game's public record. */
function record(ctx: Ctx, line: string): void {
	ctx.state.log.push(line);
}

function openClue(ctx: Ctx, team: TeamName, minute: number): void {
	const state = ctx.state;
	state.team = team;
	state.phase = "clue";
	state.clue = null;
	state.opened = minute;
	state.told = [];
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	const rng = ctx.rng("clue-grid", "grid", game);
	state.grid = dealGrid({ size: ctx.options.size, perTeam: ctx.options.perTeam, shadows: ctx.options.shadows }, (items) => rng.shuffle(items));
	state.startingTeam = game % 2 === 1 ? "amber" : "teal";
	state.clues = [];
	state.log = [];
	state.seen = {};
	state.briefed = [];
	state.running = true;
	ctx.emit("clue_game_started", { game, startingTeam: state.startingTeam, keepers: { amber: keeper(state, "amber"), teal: keeper(state, "teal") }, words: state.grid.map((card) => card.word) });
	ctx.emit("clue_key_dealt", { game, key: state.grid.map((card) => ({ ...card })) });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: state.startingTeam });
	// A new game, a new chat: the teams' channels show nothing of the games before.
	for (const team of TEAMS) {
		ctx.tryCall(TeamChannelApi, "newEpoch", { team });
		ctx.tryCall(TeamChannelApi, "resetCap", { team });
	}
	openClue(ctx, state.startingTeam, ctx.minute);
}

function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

/** A clue in one line: `amber "river" 2: bank (amber), cloud (fog)`. */
function clueLine(clue: Readonly<ClueRecord>): string {
	if (clue.word === "") return `${clue.team} gave no clue`;
	const guesses = clue.guesses.map((guess) => `${guess.word} (${guess.owner})`).join(", ");
	return `${clue.team} "${clue.word}" ${String(clue.number)}: ${guesses === "" ? "no guess" : guesses}`;
}

/** The game's public result in one line, for the next briefing. */
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
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: summaryOf(result, state.clues) });
	if (last) ctx.emit("clue_match_ended", { scores: { ...state.scores }, results: structuredClone(state.results) });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

/** Closes the clue on turn (or a missed clue turn) and hands the turn on, or ends the game. */
function closeClue(ctx: Ctx, clue: ClueRecord, end: ClueEnd, minute: number): void {
	const state = ctx.state;
	clue.end = end;
	clue.landed = landedOf(clue);
	state.clues.push(clue);
	state.clue = null;
	ctx.emit("clue_closed", structuredClone(clue));
	const close: Readonly<Record<ClueEnd, string>> = {
		wrong: "the turn ends on a wrong word",
		stopped: "the seekers stopped",
		limit: "no guesses left",
		timeout: "the caller ran out of time",
		finished: "all words of a team are revealed",
		"no-clue": "the keeper gave no clue in time; the turn is lost",
	};
	record(ctx, `${clue.team} clue ${String(clue.clueNo)} closed: ${close[end]}${clue.landed ? " (landed: bonus)" : ""}.`);
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
	openClue(ctx, next, minute);
}

/** A blank clue record of the team on turn: its keeper, its caller (the seekers take turns, one clue each). */
function newClue(state: Readonly<ClueState>, word: string, number: number, targets: readonly string[]): ClueRecord {
	const team = state.team;
	const clueNo = cluesOf(state, team) + 1;
	const seekers = seekersOf(state.teams[team], state.game);
	return { game: state.game, team, keeper: keeper(state, team), caller: seekers[(clueNo - 1) % seekers.length] ?? "", clueNo, word, number, targets: [...targets], guesses: [], end: null, landed: false };
}

/** Why `resident` may not give this clue now, or undefined. */
function clueRefusal(ctx: Ctx, resident: string | undefined, word: string, number: number, targets: readonly string[]): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (state.phase !== "clue" || resident !== keeper(state, state.team)) return refuse("NOT_YOUR_CLUE", `Only the keeper of the team on turn (${keeper(state, state.team)}, team ${state.team}) may give a clue now.`);
	const problem = clueProblem(word, state.grid);
	if (problem !== undefined) return refuse("BAD_CLUE", problem);
	const own = hiddenOf(state.grid, state.team);
	const most = Math.min(ctx.options.maxNumber, own.length);
	if (number < 1 || number > most) return refuse("BAD_NUMBER", `The number must be from 1 to ${String(most)}.`);
	const named = targets.map(normalizeWord);
	if (named.length !== number || new Set(named).size !== named.length) return refuse("BAD_TARGETS", `Name exactly ${String(number)} different words you mean (targets); they stay secret.`);
	const stranger = named.find((target) => !own.includes(target));
	if (stranger !== undefined) return refuse("BAD_TARGETS", `"${stranger}" is not one of your team's hidden words: ${own.join(", ")}.`);
	return undefined;
}

function giveClue(ctx: Ctx, resident: string | undefined, word: string, number: number, targets: readonly string[], reason: string): ToolSuccess | Refusal {
	const refusal = clueRefusal(ctx, resident, word, number, targets);
	if (refusal !== undefined) return refusal;
	const state = ctx.state;
	const clue = newClue(state, normalizeWord(word), number, targets.map(normalizeWord));
	state.clue = clue;
	state.phase = "guess";
	state.opened = ctx.minute;
	state.told = [];
	ctx.emit("clue_given", { game: clue.game, team: clue.team, keeper: clue.keeper, caller: clue.caller, clueNo: clue.clueNo, word: clue.word, number: clue.number });
	ctx.emit("clue_intent", { game: clue.game, team: clue.team, clueNo: clue.clueNo, targets: [...clue.targets], reason });
	record(ctx, `${clue.team} clue ${String(clue.clueNo)} from keeper ${clue.keeper}: "${clue.word}" ${String(clue.number)} (caller ${clue.caller}).`);
	ctx.tryCall(TeamChannelApi, "resetCap", { team: clue.team });
	refreshLocks(ctx);
	return reply(`Clue "${clue.word}" ${String(clue.number)} given. ${clue.caller} calls the guesses; you may not post in the team chat during the game. Wait for your next clue turn.`);
}

/** Why `resident` may not guess (or stop) now, or undefined. */
function guessRefusal(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return refuse("NO_CLUE", `No clue is being guessed; team ${state.team} waits for its keeper.`);
	if (resident !== clue.caller) return refuse("NOT_CALLER", `Only the caller of this clue (${clue.caller}, team ${clue.team}) may guess or stop.`);
	return undefined;
}

function guess(ctx: Ctx, resident: string | undefined, word: string): ToolSuccess | Refusal {
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
		closeClue(ctx, clue, "finished", ctx.minute);
		return reply(`"${card.word}" is ${card.owner}. Every word of a team is revealed: the game is over.`);
	}
	if (card.owner !== clue.team) {
		closeClue(ctx, clue, "wrong", ctx.minute);
		const what = card.owner === "shadow" ? `a shadow (your team loses ${String(ctx.options.shadowPenalty)} points)` : card.owner === "fog" ? "fog" : `a word of team ${card.owner}`;
		return reply(`"${card.word}" is ${what}. Your turn is over.`);
	}
	const left = clue.number + 1 - clue.guesses.length;
	if (left <= 0) {
		closeClue(ctx, clue, "limit", ctx.minute);
		return reply(`"${card.word}" is yours. That was the last guess for this clue; your turn is over.`);
	}
	state.opened = ctx.minute;
	return reply(`"${card.word}" is yours. You may guess again (${String(left)} left for this clue) or stop with endGuesses.`);
}

function endGuesses(ctx: Ctx, resident: string | undefined): ToolSuccess | Refusal {
	const refusal = guessRefusal(ctx, resident);
	if (refusal !== undefined) return refusal;
	const clue = ctx.state.clue;
	if (clue === null) return refuse("NO_CLUE", "No clue is being guessed.");
	if (clue.guesses.length === 0) return refuse("GUESS_FIRST", "Make at least one guess for a clue before you stop.");
	closeClue(ctx, clue, "stopped", ctx.minute);
	return reply("You stopped. The turn goes to the other team.");
}

function rulesText(ctx: Ctx): string {
	const o = ctx.options;
	return ctx.prompt("clue-grid/rules", {
		size: o.size,
		perTeam: o.perTeam,
		fog: o.size - 2 * o.perTeam - o.shadows,
		shadows: o.shadows,
		maxNumber: o.maxNumber,
		maxClues: o.maxClues,
		wordPoints: o.wordPoints,
		shadowPenalty: o.shadowPenalty,
		landedBonus: o.landedBonus,
		finishBonus: o.finishBonus,
		deadline: o.deadline,
	});
}

function roleLine(state: Readonly<ClueState>, resident: string): string {
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

/** The task of `resident` now, or undefined. */
function taskText(ctx: Ctx, resident: string): string | undefined {
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
		});
	}
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return undefined;
	const seekers = seekersOf(state.teams[clue.team], state.game);
	if (!seekers.includes(resident)) return undefined;
	const grid = gridText(state.grid, columns, false);
	if (resident === clue.caller) {
		const partner = seekers.filter((id) => id !== resident).join(" and ");
		return ctx.prompt("clue-grid/task-caller", { team: clue.team, word: clue.word, number: clue.number, keeper: clue.keeper, partner: partner === "" ? "nobody" : partner, grid, left: clue.number + 1 - clue.guesses.length });
	}
	return ctx.prompt("clue-grid/task-partner", { team: clue.team, word: clue.word, number: clue.number, keeper: clue.keeper, caller: clue.caller, grid });
}

/** The resident's task in one line (the view already shows the grid). */
function taskHint(state: Readonly<ClueState>, resident: string): string | undefined {
	if (state.phase === "clue" && resident === keeper(state, state.team)) return `Your task: give team ${state.team}'s clue with giveClue (word, number, targets).`;
	const clue = state.clue;
	if (state.phase !== "guess" || clue === null) return undefined;
	if (resident === clue.caller) return `Your task: call the guesses for "${clue.word}" ${String(clue.number)} with guess, or stop with endGuesses after at least one guess.`;
	if (seekersOf(state.teams[clue.team], state.game).includes(resident)) return `Your task: advise ${clue.caller} in the team chat (postTeam).`;
	return undefined;
}

function gridView(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	const totals = TEAMS.map((team) => `${team} ${String(state.scores[team] ?? 0)}`).join(", ");
	if (state.finished) return `The match is over. Points: ${totals}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over. Match points: ${totals}. The next game starts soon.`;
	const showKey = resident !== undefined && isKeeper(state, resident);
	const turn = state.phase === "clue" ? `Team ${state.team} waits for a clue from its keeper ${keeper(state, state.team)}.` : `Team ${state.team} guesses clue "${state.clue?.word ?? ""}" ${String(state.clue?.number ?? 0)}; caller ${state.clue?.caller ?? ""}, ${String((state.clue?.number ?? 0) + 1 - (state.clue?.guesses.length ?? 0))} guesses left.`;
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}. Keepers: amber ${keeper(state, "amber")}, teal ${keeper(state, "teal")}. Match points before this game: ${totals}.`,
		showKey ? "The grid with the key (only keepers see the owners of hidden words):" : "The grid (revealed words show their owner in brackets):",
		gridText(state.grid, ctx.options.columns, showKey),
		`${scoreLine(state)}.`,
		turn,
	];
	const recent = state.log.slice(-RECORD_LINES);
	if (recent.length > 0) lines.push(`The game so far:\n${recent.join("\n")}`);
	const hint = resident === undefined ? undefined : taskHint(state, resident);
	if (hint !== undefined) lines.push(hint);
	return lines.join("\n");
}

const wordParam = (description: string) => Type.String({ minLength: 1, maxLength: 40, description });

export const clueGrid = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewGrid",
			description: "clue-grid/tools/viewGrid",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(gridView(ctx, ctx.resident)),
		}),
		kit.tool({
			name: GIVE_CLUE,
			description: "clue-grid/tools/giveClue",
			parameters: Type.Object({
				word: wordParam("The clue: one word, not on the grid and not part of a grid word."),
				number: Type.Integer({ minimum: 1, description: "How many of your team's words the clue points to." }),
				targets: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 10, description: "Exactly `number` of your team's hidden words you mean. Secret: only the record sees them." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record only." })),
			}),
			suggest: ["resident"],
			rule: (params, ctx) => clueRefusal(ctx, ctx.resident, params.word, params.number, params.targets),
			execute: (params, ctx) => giveClue(ctx, ctx.resident, params.word, params.number, params.targets, params.reason ?? ""),
		}),
		kit.tool({
			name: GUESS,
			description: "clue-grid/tools/guess",
			parameters: Type.Object({
				word: wordParam("A hidden word of the grid to reveal."),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			suggest: ["resident"],
			rule: (_params, ctx) => guessRefusal(ctx, ctx.resident),
			execute: (params, ctx) => guess(ctx, ctx.resident, params.word),
		}),
		kit.tool({
			name: END_GUESSES,
			description: "clue-grid/tools/endGuesses",
			parameters: Type.Object({}),
			suggest: ["resident"],
			rule: (_params, ctx) => guessRefusal(ctx, ctx.resident),
			execute: (_params, ctx) => endGuesses(ctx, ctx.resident),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	// A keeper says nothing in the team chat while a game runs; the clue is the only channel.
	pipeline: {
		lock: (call, ctx) => (call.tool === TEAM_POST && call.resident !== undefined && ctx.state.running && isKeeper(ctx.state, call.resident) ? refuse("KEEPER_SILENT", ctx.prompt("clue-grid/keeper-silent", {})) : undefined),
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.clueGrid,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.clueGrid,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || state.phase === "idle" || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				if (state.phase === "clue") {
					closeClue(ctx, newClue(state, "", 0, []), "no-clue", ctx.minute + 1);
					return;
				}
				if (state.clue !== null) closeClue(ctx, state.clue, "timeout", ctx.minute + 1);
			},
		},
		news: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running) return false;
			if (state.phase === "clue") return resident === keeper(state, state.team);
			const clue = state.clue;
			if (clue === null) return false;
			if (resident === clue.caller) return true;
			return seekersOf(state.teams[clue.team], state.game).includes(resident) && !state.told.includes(resident);
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.clueGrid,
			run: (resident, ctx) => {
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
				// The keeper and the caller owe a move and see their task at every turn; the advising seeker once per clue.
				const task = taskText(ctx, resident);
				const owes = (state.phase === "clue" && resident === keeper(state, state.team)) || resident === state.clue?.caller;
				if (task !== undefined && (owes || !state.told.includes(resident))) {
					if (!state.told.includes(resident)) state.told.push(resident);
					lines.push(task);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
		results: kit.fact(Type.Array(GameResult), (view) => structuredClone(view.state.results)),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ClueSlice,
		save: (state) => copyState(state),
		load: (data) => copyState(data),
	}),
}));

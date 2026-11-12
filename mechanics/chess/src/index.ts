/**
 * The `chess` mechanic: a match of chess games between two solo seats (docs/ideas/game-roadmap.md
 * §2.8), with chess.js as the legality filter and the referee. The model never changes the board
 * itself: `playMove` takes the move as text (SAN such as `Nf3`, or `g1f3`), chess.js reads it, and an
 * illegal or unreadable move is refused (event `move_refused`, for the human) while the board stays as
 * it was. chess.js also ends a game: checkmate, stalemate, threefold repetition, the fifty-move rule,
 * insufficient material. On top of that:
 * - a move cap (`maxPlies`): the game is stopped and scored on material (`adjudicateMargin`);
 * - a forfeit clock: a seat that ends `maxIdleTurns` turns in a row on move without a legal move gets a
 *   seeded random legal move played for it; `maxForfeits` such moves in one game lose that game;
 * - `resign`, on one's own move;
 * - the colours swap from game to game (`alternateColours`), A01 is White in game 1.
 * Every move is scored for the human against a material baseline (`move_scored`, a one-ply check with
 * a static exchange, not an engine). A strategy brain plugs in through `BrainSourceApi` (it may hold the
 * next game back for a retro) and `StrategyBrainApi` (game start and end); without one the match runs
 * on its own. The opponent waits while one seat thinks: only the seat on move has news.
 */
import { Type, type Static } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, TurnLine, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import type { Chess } from "chess.js";
import { adjudicate, colourOf, endOf, EndReason, loosePieces, materialOf, MoveClass, moveText, parseMove, replay, Result, scoreMove, type Colour } from "./model.ts";


const TOOLS = { play: "playMove", resign: "resign" } as const;

const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 2, description: "How many games the match has; the run ends after the last." }),
	alternateColours: Type.Boolean({ default: true, description: "The colours swap from game to game (the first seat is White in game 1); false: the first seat is always White." }),
	maxPlies: Type.Integer({ minimum: 2, default: 160, description: "Half-moves after which a game is stopped and scored on material." }),
	adjudicateMargin: Type.Integer({ minimum: 1, default: 3, description: "At the move cap, the side ahead by at least this much material (pawn 1, queen 9) wins; else a draw." }),
	maxIdleTurns: Type.Integer({ minimum: 1, default: 3, description: "Turns in a row on move without a legal move before a random legal move is played for the seat." }),
	maxForfeits: Type.Integer({ minimum: 0, default: 3, description: "Forfeit moves in one game that lose it; 0: never." }),
	showLegalMoves: Type.Boolean({ default: false, description: "The position shown to the seat on move lists every legal move (off: the list comes only with a refused move)." }),
	showThreats: Type.Boolean({ default: false, description: "The position shown to every seat lists each side's loose pieces: attacked and undefended, or attacked by a cheaper piece (a static check, no pins)." }),
	score: Type.Boolean({ default: true, description: "Score every move against the material baseline (`move_scored`, for the human)." }),
	teams: Type.Optional(
		Type.Record(Type.String(), Type.Array(Type.String(), { minItems: 1 }), {
			description: "The two sides by name, each with its members in the order the captaincy rotates (one move each). Default: each of the two residents is a side of its own, named by its id.",
		}),
	),
	coach: Type.Boolean({ default: false, description: "After each game, every side gets a private review of its own worst moves by the material baseline, shown in its next brain retro (needs a strategy brain)." }),
	coachMoves: Type.Integer({ minimum: 1, default: 3, description: "How many of a side's worst moves the coach's review names." }),
	wakeTeam: Type.Boolean({ default: false, description: "Every member of the side on move gets one turn per half-move to advise its captain in the team chat; false: only the captain has news." }),
	freshContext: Type.Boolean({
		default: false,
		description: "The seat on move starts every half-move from a fresh context: the rules, its strategy brain, the note it gave with its last move, and the position (false: the context is dropped only between games).",
	}),
	compactBoard: Type.Boolean({ default: false, description: "The position is shown as a compact grid without spaces and only the last moves (false: the spaced grid and the whole move list)." }),
	compactMoves: Type.Integer({ minimum: 1, default: 12, description: "Half-moves the compact board lists." }),
	settleCap: Type.Boolean({
		default: false,
		description: "At the move cap, the side to move is credited with the most it can win with one capture before the material is counted, so a grab on the last half-move into a recapture does not count (LH17).",
	}),
});

const GameRecord = Type.Object({
	game: Type.Integer(),
	white: Type.String(),
	black: Type.String(),
	result: Result,
	reason: EndReason,
	plies: Type.Integer(),
	moves: Type.Array(Type.String()),
	illegal: Type.Record(Type.String(), Type.Integer()),
	forfeits: Type.Record(Type.String(), Type.Integer()),
	resigned: Type.Optional(Type.String()),
});
type GameRecord = Static<typeof GameRecord>;

const ChessSlice = Type.Object({
	/** The two sides by name (a solo side is named by its resident). */
	seats: Type.Array(Type.String()),
	members: Type.Record(Type.String(), Type.Array(Type.String())),
	/** Moves each side has played in the running game; the captaincy rotates by it. */
	taken: Type.Record(Type.String(), Type.Integer()),
	game: Type.Integer(),
	white: Type.String(),
	black: Type.String(),
	moves: Type.Array(Type.String()),
	idle: Type.Integer(),
	turnPly: Type.Integer(),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	illegal: Type.Record(Type.String(), Type.Integer()),
	forfeits: Type.Record(Type.String(), Type.Integer()),
	results: Type.Array(GameRecord),
	scores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	/** The reason each resident gave with its last move in the running game (shown after a fresh context). */
	notes: Type.Optional(Type.Record(Type.String(), Type.Object({ moveNo: Type.Integer(), san: Type.String(), text: Type.String() }))),
});
type ChessState = Static<typeof ChessSlice>;

const ColourSchema = Type.Union([Type.Literal("white"), Type.Literal("black")]);

const head = defineHead({
	id: "chess",
	summary: "A match of chess games between two solo seats; chess.js checks every move and ends the games.",
	options,
	state: (setup): ChessState => {
		const teams = setup.options.teams ?? Object.fromEntries(setup.residents.map((id) => [id, [id]]));
		const names = Object.keys(teams);
		if (names.length !== 2) throw new Error(`chess: the match needs exactly two sides, not ${String(names.length)}`);
		const members = Object.values(teams).flat();
		if (new Set(members).size !== members.length) throw new Error("chess: a resident may play on one side only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new Error(`chess: ${unknown} is not a resident of the run`);
		return {
			seats: names,
			members: Object.fromEntries(Object.entries(teams).map(([name, list]) => [name, [...list]])),
			taken: Object.fromEntries(names.map((name) => [name, 0])),
			game: 0,
			white: "",
			black: "",
			moves: [],
			idle: 0,
			turnPly: -1,
			told: [],
			briefed: [],
			illegal: {},
			forfeits: {},
			results: [],
			scores: Object.fromEntries(names.map((name) => [name, 0])),
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: {
		game_started: Type.Object({ game: Type.Integer(), white: Type.String(), black: Type.String() }),
		move_played: Type.Object({
			game: Type.Integer(),
			ply: Type.Integer({ description: "The half-move's number in its game, from 1." }),
			colour: ColourSchema,
			by: Type.String(),
			san: Type.String(),
			written: Type.String({ description: "The move as the seat wrote it ('' for a forfeit move)." }),
			fen: Type.String({ description: "The position after the move." }),
			forfeit: Type.Boolean(),
		}),
		move_refused: Type.Object({ game: Type.Integer(), ply: Type.Integer(), colour: ColourSchema, by: Type.String(), written: Type.String(), count: Type.Integer({ description: "The seat's refused moves in this game so far, this one included." }) }),
		move_scored: Type.Object({
			game: Type.Integer(),
			ply: Type.Integer(),
			colour: ColourSchema,
			by: Type.String(),
			san: Type.String(),
			best: Type.String(),
			bestValue: Type.Number(),
			playedValue: Type.Number(),
			loss: Type.Number(),
			class: MoveClass,
		}),
		game_ended: Type.Object({ ...GameRecord.properties, pgn: Type.String() }),
		match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
		coach_review: Type.Object({ game: Type.Integer(), side: Type.String(), losses: Type.Integer({ description: "The side's moves that lost material by the baseline (loss 1 or more)." }), text: Type.String() }),
	},
	// The baseline's verdict and the refused attempts are for the human and the reporter only.
	audiences: { move_scored: ["human"], move_refused: ["human"], coach_review: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi, TeamChannelApi],
	prompts: {
		"chess/tools/viewBoard": [],
		"chess/tools/playMove": [],
		"chess/tools/resign": [],
		"chess/rules": ["game", "games", "colour", "opponent", "maxMoves"],
		"chess/your-move": ["game", "moveNo", "colour"],
		"chess/last-move": ["san"],
		"chess/check": [],
		"chess/legal-moves": ["moves"],
		"chess/threats": ["white", "black"],
		"chess/how-to-move": [],
		"chess/still-your-move": ["game", "moveNo"],
		"chess/forfeit-warning": ["left"],
		"chess/advise": ["colour", "captain"],
		"chess/coach-review": ["count", "total", "moves"],
		"chess/coach-clean": ["total"],
		"chess/coach-move": ["moveNo", "san", "loss", "best"],
		"chess/fresh-context": [],
		"chess/last-note": ["moveNo", "san", "text"],
		"chess/cap-settled": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." }));

const capital = (colour: Colour): string => (colour === "white" ? "White" : "Black");

/** The side `resident` plays on, or undefined. */
function teamOf(state: Readonly<ChessState>, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return state.seats.find((team) => state.members[team]?.includes(resident) === true);
}

/** The side on move, or undefined when no game runs. */
function sideOnMove(state: Readonly<ChessState>, chess: Chess): string | undefined {
	if (!state.running) return undefined;
	return colourOf(chess) === "white" ? state.white : state.black;
}

/** The member of `team` who plays its next move: the captaincy rotates, one move each. */
function captainOf(state: Readonly<ChessState>, team: string): string | undefined {
	const members = state.members[team] ?? [];
	return members[(state.taken[team] ?? 0) % Math.max(1, members.length)];
}

/** The resident who plays the next move (the captain of the side on move), or undefined when no game runs. */
function moverOf(state: Readonly<ChessState>, chess: Chess): string | undefined {
	const team = sideOnMove(state, chess);
	return team === undefined ? undefined : captainOf(state, team);
}

/** How a side is named in texts: a solo side by its resident, a team as `team A (A01, A02)`. */
function labelOf(state: Readonly<ChessState>, team: string): string {
	const members = state.members[team] ?? [];
	return members.length === 1 && members[0] === team ? team : `team ${team} (${members.join(", ")})`;
}

const boardNow = (state: Readonly<ChessState>): Chess => replay(state.moves);

const moveNoOf = (plies: number): number => Math.floor(plies / 2) + 1;

/** Opens `playMove` and `resign` for the seat on move and closes them for the other. */
function refreshLocks(ctx: Ctx, chess: Chess): void {
	const mover = moverOf(ctx.state, chess);
	for (const resident of ctx.residents.ids) {
		for (const tool of [TOOLS.play, TOOLS.resign]) {
			if (resident === mover) ctx.access.unlock(resident, tool);
			else ctx.access.lock(resident, tool);
		}
	}
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	const [first, second] = state.seats;
	if (first === undefined || second === undefined) return;
	const swap = ctx.options.alternateColours && game % 2 === 0;
	state.game = game;
	state.white = swap ? second : first;
	state.black = swap ? first : second;
	state.moves = [];
	state.idle = 0;
	state.turnPly = -1;
	state.told = [];
	state.briefed = [];
	state.illegal = {};
	state.forfeits = {};
	state.taken = Object.fromEntries(state.seats.map((team) => [team, 0]));
	state.running = true;
	ctx.emit("game_started", { game, white: state.white, black: state.black });
	// A new game, a new chat: the teams' channels show nothing of the games before.
	for (const team of state.seats) ctx.tryCall(TeamChannelApi, "newEpoch", { team });
	ctx.tryCall(TeamChannelApi, "resetCap", { team: state.white });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	refreshLocks(ctx, boardNow(state));
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

const REASON_TEXT: Readonly<Record<EndReason, string>> = {
	checkmate: "by checkmate",
	stalemate: "by stalemate",
	threefold_repetition: "by threefold repetition",
	fifty_moves: "by the fifty-move rule",
	insufficient_material: "by insufficient material",
	move_cap: "at the move cap, on material",
	forfeits: "on forfeits",
	resignation: "by resignation",
};

/** Every move of a game with the spellings a brain might copy it in: SAN and from-to (`Nf3`, `g1f3`). */
function spellingsOf(moves: readonly string[]): string[][] {
	const chess = replay([]);
	return moves.map((san) => {
		const move = chess.move(san);
		return [...new Set([san.replace(/[+#]$/, ""), move.lan, `${move.from}-${move.to}`])];
	});
}

/** The game's public result in one line, for the next briefings. */
function summaryOf(state: Readonly<ChessState>, record: GameRecord): string {
	const moves = `after ${String(moveNoOf(record.plies - 1))} moves`;
	const how = REASON_TEXT[record.reason];
	const white = `${labelOf(state, record.white)} (White)`;
	const black = `${labelOf(state, record.black)} (Black)`;
	if (record.result === "1/2-1/2") return `${white} and ${black} drew ${how} ${moves}`;
	const [winner, loser] = record.result === "1-0" ? [white, black] : [black, white];
	return `${winner} beat ${loser} ${how} ${moves}`;
}

/**
 * The coach's private review of one game per side: the side's worst moves by the material baseline
 * (`scoreMove`, one ply with a static exchange: hanging pieces and missed free captures, no deeper
 * tactics), worst first. Forfeit moves count too: the seat let the clock play them.
 */
function reviewsOf(ctx: Ctx, record: GameRecord): Record<string, string> {
	const scored = record.moves.map((san, index) => ({ index, san, scored: scoreMove(record.moves.slice(0, index), san) }));
	const reviews: Record<string, string> = {};
	for (const side of [record.white, record.black]) {
		const parity = side === record.white ? 0 : 1;
		const own = scored.filter((move) => move.index % 2 === parity);
		const losses = own.flatMap((move) => (move.scored !== undefined && move.scored.loss >= 1 ? [{ ...move, loss: move.scored.loss, best: move.scored.best }] : []));
		const worst = [...losses].sort((a, b) => b.loss - a.loss || a.index - b.index).slice(0, ctx.options.coachMoves);
		const moves = worst.map((move) => ctx.prompt("chess/coach-move", { moveNo: `${String(moveNoOf(move.index))}${parity === 0 ? "." : "..."}`, san: move.san, loss: move.loss >= 50 ? "a mate (missed or allowed)" : `${String(move.loss)} pawn${move.loss === 1 ? "" : "s"} of material`, best: move.best })).join("\n");
		const text = losses.length === 0 ? ctx.prompt("chess/coach-clean", { total: own.length }) : ctx.prompt("chess/coach-review", { count: losses.length, total: own.length, moves });
		reviews[side] = text;
		ctx.emit("coach_review", { game: record.game, side, losses: losses.length, text });
	}
	return reviews;
}

function endGame(ctx: Ctx, result: Result, reason: EndReason, resigned?: string): void {
	const state = ctx.state;
	const record: GameRecord = {
		game: state.game,
		white: state.white,
		black: state.black,
		result,
		reason,
		plies: state.moves.length,
		moves: [...state.moves],
		illegal: { ...state.illegal },
		forfeits: { ...state.forfeits },
		...(resigned === undefined ? {} : { resigned }),
	};
	state.results.push(record);
	const points = result === "1-0" ? [1, 0] : result === "0-1" ? [0, 1] : [0.5, 0.5];
	state.scores[state.white] = (state.scores[state.white] ?? 0) + (points[0] ?? 0);
	state.scores[state.black] = (state.scores[state.black] ?? 0) + (points[1] ?? 0);
	state.running = false;
	state.told = [];
	state.notes = {};
	const chess = boardNow(state);
	chess.setHeader("White", state.white);
	chess.setHeader("Black", state.black);
	chess.setHeader("Round", String(state.game));
	chess.setHeader("Result", result);
	ctx.emit("game_ended", { ...record, moves: [...record.moves], illegal: { ...record.illegal }, forfeits: { ...record.forfeits }, pgn: chess.pgn() });
	refreshLocks(ctx, chess);
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const review = ctx.options.coach && !last ? reviewsOf(ctx, record) : undefined;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: summaryOf(state, record), line: spellingsOf(record.moves), ...(review === undefined ? {} : { review }) });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

/** Plays the (legal) move `san` for the seat on move, scores it, and ends the game when it is over. */
function applyMove(ctx: Ctx, san: string, written: string, forfeit: boolean): string {
	const state = ctx.state;
	const before = [...state.moves];
	const chess = boardNow(state);
	const colour = colourOf(chess);
	const by = moverOf(state, chess) ?? "";
	const side = sideOnMove(state, chess);
	const scored = ctx.options.score ? scoreMove(before, san) : undefined;
	chess.move(san);
	state.moves.push(san);
	if (side !== undefined) state.taken[side] = (state.taken[side] ?? 0) + 1;
	state.idle = 0;
	state.told = [];
	const ply = state.moves.length;
	ctx.emit("move_played", { game: state.game, ply, colour, by, san, written, fen: chess.fen(), forfeit });
	if (scored !== undefined) ctx.emit("move_scored", { game: state.game, ply, colour, by, san, ...scored });
	const end = endOf(chess);
	if (end !== undefined) {
		endGame(ctx, end.result, end.reason);
		return end.reason === "checkmate" ? `${san} is checkmate. You win game ${String(state.game)}.` : `${san} played. Game ${String(state.game)} is drawn ${REASON_TEXT[end.reason]}.`;
	}
	if (ply >= ctx.options.maxPlies) {
		const result = adjudicate(chess, ctx.options.adjudicateMargin, ctx.options.settleCap);
		endGame(ctx, result, "move_cap");
		return `${san} played. Game ${String(state.game)} reached the move cap and is scored on material: ${result}.`;
	}
	refreshLocks(ctx, chess);
	const next = sideOnMove(state, chess);
	if (next !== undefined) ctx.tryCall(TeamChannelApi, "resetCap", { team: next });
	return `${san} played${chess.inCheck() ? " (check)" : ""}. Now it is your opponent's move; end your turn.`;
}

/** Why `resident` may not move now (not the move's legality), or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const team = teamOf(state, resident);
	if (resident === undefined || team === undefined) return refuse("NOT_A_SEAT", "You have no seat at this board.");
	const chess = boardNow(state);
	if (sideOnMove(state, chess) !== team) return refuse("NOT_YOUR_MOVE", "It is not your move; wait for your opponent.");
	const captain = moverOf(state, chess);
	if (captain !== resident) return refuse("NOT_CAPTAIN", `${captain ?? "Your captain"} plays this move for your side; advise in the team chat.`);
	return undefined;
}

/**
 * What a refused move is told: with `showLegalMoves` every legal move; otherwise only the legal moves of
 * the piece the text names (its from-square, or its piece letter), so an illegal try cannot fetch the
 * whole list the arm without it is meant to withhold (chess-02a-006).
 */
function refusalHint(ctx: Ctx, chess: Chess, written: string): string {
	const legal = chess.moves({ verbose: true });
	if (ctx.options.showLegalMoves) return `Legal moves: ${legal.map((move) => move.san).join(", ")}.`;
	const from = /^\s*([a-h][1-8])/.exec(written)?.[1];
	const letter = /^\s*([KQRBN])/.exec(written)?.[1]?.toLowerCase();
	const own = legal.filter((move) => (from !== undefined ? move.from === from : letter !== undefined ? move.piece === letter : false));
	if (from === undefined && letter === undefined) return "Write the move as SAN (Nf3) or from and to squares (g1f3).";
	return own.length === 0 ? "That piece has no legal move now." : `Legal moves of that piece: ${own.map((move) => move.san).join(", ")}.`;
}

function play(ctx: ToolCtx, written: string, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, ctx.resident);
	if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this board.");
	const state = ctx.state;
	const chess = boardNow(state);
	const move = parseMove(chess, written);
	if (move === undefined) {
		const count = (state.illegal[ctx.resident] ?? 0) + 1;
		state.illegal[ctx.resident] = count;
		ctx.emit("move_refused", { game: state.game, ply: state.moves.length + 1, colour: colourOf(chess), by: ctx.resident, written, count });
		return refuse("ILLEGAL_MOVE", `"${written}" is not a legal move in this position (${capital(colourOf(chess))} to move). The board is unchanged. ${refusalHint(ctx, chess, written)}`);
	}
	const moveNo = moveNoOf(state.moves.length);
	const resident = ctx.resident;
	const text = applyMove(ctx, move.san, written, false);
	const note = reason?.trim() ?? "";
	if (ctx.options.freshContext && note.length > 0 && state.running) state.notes = { ...(state.notes ?? {}), [resident]: { moveNo, san: move.san, text: note } };
	return reply(text, { endsTurn: true });
}

/** The position for `resident`: the board, the moves, the material, and whose move it is. */
function positionText(ctx: Ctx, resident: string | undefined, chess: Chess): string {
	const state = ctx.state;
	const colour = colourOf(chess);
	const material = materialOf(chess);
	const team = teamOf(state, resident);
	const own = team === undefined ? undefined : team === state.white ? "white" : "black";
	const onMove = sideOnMove(state, chess);
	const captain = onMove === undefined || (state.members[onMove]?.length ?? 0) < 2 ? "" : ` Captain of this move: ${moverOf(state, chess) ?? ""}.`;
	const compact = ctx.options.compactBoard;
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}. White: ${labelOf(state, state.white)}. Black: ${labelOf(state, state.black)}.${own === undefined ? "" : ` You play ${capital(own)}.`}`,
		compact ? "The board (rank 8 at the top, files a-h left to right; upper case White, lower case Black, '.' empty):" : "The board (White at the bottom; upper case White, lower case Black, '.' empty):",
		compact ? compactGrid(chess) : chess.ascii().trimEnd(),
		`FEN: ${chess.fen()}`,
		compact ? lastMovesLine(state.moves, ctx.options.compactMoves) : `Moves so far: ${state.moves.length === 0 ? "none" : moveText(state.moves)}`,
		`Material: White ${String(material.white)}, Black ${String(material.black)}.`,
		`${capital(colour)} to move (move ${String(moveNoOf(state.moves.length))})${chess.inCheck() ? ", in check" : ""}.${captain}`,
	];
	if (ctx.options.showThreats) {
		const list = (side: "w" | "b"): string => loosePieces(chess, side).join("; ") || "none";
		lines.push(ctx.prompt("chess/threats", { white: list("w"), black: list("b") }));
	}
	if (ctx.options.showLegalMoves && resident !== undefined && moverOf(state, chess) === resident) lines.push(ctx.prompt("chess/legal-moves", { moves: chess.moves().join(", ") }));
	return lines.join("\n");
}

/** The board as eight lines `8 r.bqkbnr`, rank 8 first: about a third of the tokens of the spaced grid. */
function compactGrid(chess: Chess): string {
	const rows = chess.board().map((row, index) => `${String(8 - index)} ${row.map((square) => (square === null ? "." : square.color === "w" ? square.type.toUpperCase() : square.type)).join("")}`);
	return [...rows, "  abcdefgh"].join("\n");
}

/** The last `count` half-moves, numbered: `Last moves (30 half-moves played): 13. cxd4 Nc6 14. Nb3 ...`. */
function lastMovesLine(moves: readonly string[], count: number): string {
	if (moves.length === 0) return "Moves so far: none";
	const from = Math.max(0, moves.length - count);
	const parts: string[] = [];
	for (let index = from; index < moves.length; index += 1) {
		const san = moves[index] ?? "";
		const number = String(Math.floor(index / 2) + 1);
		if (index % 2 === 0) parts.push(`${number}. ${san}`);
		else parts.push(index === from ? `${number}... ${san}` : san);
	}
	return from === 0 ? `Moves so far: ${parts.join(" ")}` : `Last moves (${String(moves.length)} half-moves played): ${parts.join(" ")}`;
}

function boardText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	const scores = state.seats.map((seat) => `${labelOf(state, seat)} ${String(state.scores[seat] ?? 0)}`).join(", ");
	if (state.finished) return `The match is over. Points: ${scores}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scores}.`;
	return `${positionText(ctx, resident, boardNow(state))}\nPoints so far: ${scores}.`;
}

/**
 * The briefing of a fresh context (`freshContext`): the rules, the seat's strategy brain (through the
 * strategy brain, when the story has one) and the note it gave with its last move.
 */
function freshBriefing(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	const team = teamOf(state, resident) ?? resident;
	const white = team === state.white;
	const lines = [
		ctx.prompt("chess/fresh-context", {}),
		ctx.prompt("chess/rules", { game: state.game, games: ctx.options.games, colour: white ? "White" : "Black", opponent: labelOf(state, white ? state.black : state.white), maxMoves: Math.ceil(ctx.options.maxPlies / 2) }),
	];
	if (ctx.options.settleCap) lines.push(ctx.prompt("chess/cap-settled", {}));
	const brain = ctx.tryCall(StrategyBrainApi, "briefing", { resident });
	if (brain !== undefined && brain.length > 0) lines.push(brain);
	const note = state.notes?.[resident];
	if (note !== undefined) lines.push(ctx.prompt("chess/last-note", { moveNo: note.moveNo, san: note.san, text: note.text }));
	return lines.join("\n\n");
}

/** What the seat on move is told at its turn: the full position once per half-move, a short reminder after. */
function moverLines(ctx: Ctx, resident: string, chess: Chess): TurnLine[] {
	const state = ctx.state;
	const game = state.game;
	const moveNo = moveNoOf(state.moves.length);
	if (state.told.includes(resident)) {
		const lines = [ctx.prompt("chess/still-your-move", { game, moveNo })];
		const left = ctx.options.maxIdleTurns - state.idle;
		if (state.idle > 0) lines.push(ctx.prompt("chess/forfeit-warning", { left }));
		return lines;
	}
	state.told.push(resident);
	const lines: TurnLine[] = [];
	if (ctx.options.freshContext) lines.push({ kind: "context-reset", text: freshBriefing(ctx, resident) });
	lines.push(ctx.prompt("chess/your-move", { game, moveNo, colour: capital(colourOf(chess)) }));
	const last = state.moves[state.moves.length - 1];
	if (last !== undefined) lines.push(ctx.prompt("chess/last-move", { san: last }));
	if (chess.inCheck()) lines.push(ctx.prompt("chess/check", {}));
	lines.push(positionText(ctx, resident, chess));
	lines.push(ctx.prompt("chess/how-to-move", {}));
	return lines;
}

export const chess = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewBoard",
			description: "chess/tools/viewBoard",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(boardText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: TOOLS.play,
			description: "chess/tools/playMove",
			parameters: Type.Object({ move: Type.String({ minLength: 1, maxLength: 40, description: "The move: SAN (Nf3, exd5, O-O, e8=Q) or from and to squares (g1f3, e7e8q)." }), reason: Reason }),
			suggest: ["resident"],
			rule: (_params, ctx) => problemWith(ctx, ctx.resident),
			execute: (params, ctx) => play(ctx, params.move, params.reason),
		}),
		kit.tool({
			name: TOOLS.resign,
			description: "chess/tools/resign",
			parameters: Type.Object({ reason: Reason }),
			suggest: ["resident"],
			rule: (_params, ctx) => problemWith(ctx, ctx.resident),
			execute: (_params, ctx) => {
				const refusal = problemWith(ctx, ctx.resident);
				if (refusal !== undefined || ctx.resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this board.");
				const game = ctx.state.game;
				endGame(ctx, teamOf(ctx.state, ctx.resident) === ctx.state.white ? "0-1" : "1-0", "resignation", ctx.resident);
				return reply(`You resigned game ${String(game)}.`, { endsTurn: true });
			},
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
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.chess,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		news: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running) return false;
			const chess = boardNow(state);
			if (moverOf(state, chess) === resident) return true;
			return ctx.options.wakeTeam && teamOf(state, resident) === sideOnMove(state, chess) && !state.told.includes(resident);
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.chess,
			run: (resident, ctx) => {
				const state = ctx.state;
				const team = teamOf(state, resident);
				if (!state.running || team === undefined) return [];
				const chess = boardNow(state);
				const lines: TurnLine[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					const white = team === state.white;
					// A fresh context carries the rules in its briefing on every half-move.
					if (!ctx.options.freshContext || moverOf(state, chess) !== resident) {
						lines.push(ctx.prompt("chess/rules", { game: state.game, games: ctx.options.games, colour: white ? "White" : "Black", opponent: labelOf(state, white ? state.black : state.white), maxMoves: Math.ceil(ctx.options.maxPlies / 2) }));
						if (ctx.options.settleCap) lines.push(ctx.prompt("chess/cap-settled", {}));
					}
				}
				if (moverOf(state, chess) === resident) lines.push(...moverLines(ctx, resident, chess));
				else if (ctx.options.wakeTeam && sideOnMove(state, chess) === team && !state.told.includes(resident)) {
					state.told.push(resident);
					lines.push(ctx.prompt("chess/advise", { colour: capital(colourOf(chess)), captain: moverOf(state, chess) ?? "" }), positionText(ctx, resident, chess));
				}
				return lines;
			},
		},
		turnOpened: (resident, ctx) => {
			const state = ctx.state;
			if (state.running && moverOf(state, boardNow(state)) === resident) state.turnPly = state.moves.length;
		},
		// A turn on move that ended without a move counts toward the forfeit clock.
		turnEnded: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running || state.turnPly !== state.moves.length) return;
			const chess = boardNow(state);
			if (moverOf(state, chess) !== resident) return;
			state.turnPly = -1;
			state.idle += 1;
			if (state.idle < ctx.options.maxIdleTurns) return;
			const team = teamOf(state, resident) ?? resident;
			const forfeits = (state.forfeits[team] ?? 0) + 1;
			state.forfeits[team] = forfeits;
			if (ctx.options.maxForfeits > 0 && forfeits >= ctx.options.maxForfeits) {
				endGame(ctx, team === state.white ? "0-1" : "1-0", "forfeits");
				return;
			}
			// A running game always has a legal move: chess.js ends it at mate or stalemate.
			applyMove(ctx, ctx.rng("chess", "forfeit", state.game, state.moves.length).pick(chess.moves()), "", true);
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
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ChessSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));

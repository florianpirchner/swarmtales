/**
 * The `strategy-brain` mechanic: one short free text per team (or one shared text), carried from game
 * to game in place of the residents' conversation. It is the only cross-game memory of a match:
 * - at a game's start every resident gets a `context-reset` turn line (docs/design/context-reset.md)
 *   with a briefing of the game's number, the sides, the results so far (result only, never moves) and,
 *   when the brain is `enabled`, the team's brain. `enabled: false` gives the identical briefing minus
 *   the brain, so the brain is the only difference between two arms;
 * - after each game but the last (and before the first when `brainAtStart`) a retro window holds the
 *   next game back (`GridGameApi.hold`). Only the retro captain of a team (rotating by game) may call
 *   `writeBrain`, at most `maxWords` words, and not as a replay of one game's move list. The window of
 *   a team closes when the text is written, or at a minute's end when its members made `retroMaxPosts`
 *   team posts, or after `retroMaxMinutes` minutes; when every window is closed the game is released;
 * - every version is the event `brain_written` (audience `human`, so a gamemaker never reads it).
 * It reads the board's words only through the grid-game's events and API. A game other than the grid
 * game provides `BrainSourceApi` (game number, hold, release) and calls `StrategyBrainApi` when a game
 * starts or ends; with `solo` every team is one resident, and the briefings and retro lines say so.
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { GridGameApi, GridGameEvents } from "@swarmtales/mechanic-grid-game";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import { BrainSourceApi, StrategyBrainApi } from "./source.ts";
import { hashText, replaysLine, replaysMoves, wordCount } from "./text.ts";

export { BrainSourceApi, StrategyBrainApi } from "./source.ts";


const WRITE = "writeBrain";
/** A game with fewer moves than this is too short to count as "a game's move list". */
const MIN_REPLAY_MOVES = 5;
/** A run of this many half-moves of a game whose moves are text (chess) counts as a replay. */
const MIN_REPLAY_LINE = 8;

const options = Type.Object({
	enabled: Type.Boolean({ default: true, description: "false: no brain and no retro, only the result-only briefing at each game's start (the control arm)." }),
	brainTeams: Type.Optional(Type.Array(Type.String(), { description: "The teams that keep a brain (default: all teams). The others get the result-only briefing, no retro, and readBrain/writeBrain stay closed to them (BRAIN_DISABLED); an empty list equals enabled: false." })),
	maxWords: Type.Integer({ minimum: 1, default: 300, description: "The most words a brain may have." }),
	teams: Type.Record(Type.String(), Type.Array(Type.String(), { description: "Resident ids of one team; the retro captain rotates through them." }), {
		default: {},
		description: "The teams, by the side names the grid game uses (X, O).",
	}),
	retroMaxPosts: Type.Integer({ minimum: 1, default: 8, description: "Team posts in a retro window after which it closes, unwritten, at the end of the minute." }),
	retroMaxMinutes: Type.Integer({ minimum: 1, default: 3, description: "Minutes a retro window stays open at most." }),
	shared: Type.Boolean({ default: false, description: "One brain both teams read and write, instead of one per team." }),
	brainAtStart: Type.Boolean({ default: true, description: "Every team writes a first brain in a window before game 1." }),
	postTool: Type.String({ default: "postTeam", description: "The team-chat tool whose successful calls count as retro posts." }),
	retroFocus: Type.String({ default: "", description: "A story's own words added to every retro line: what the brain should hold (Lanterns: the team's conventions, not caution, P195). Empty: none." }),
	solo: Type.Boolean({ default: false, description: "Every team is one resident: the briefings name no team and no side, and a retro window has no team talk." }),
});

interface Brain {
	version: number;
	text: string;
}

interface Window {
	game: number;
	captain: string;
	opened: number;
	posts: number;
	told: string[];
}

interface Played {
	readonly game: number;
	readonly result: string;
	readonly moves: readonly number[];
	/** The game's own one-line result (`StrategyBrainApi.gameEnded`), shown in place of `result`. */
	readonly summary?: string;
	/** The game's moves as text with their spellings (`StrategyBrainApi.gameEnded`), for the replay check of a chess-like game. */
	readonly line?: readonly (readonly string[])[];
}

interface BrainState {
	brains: Map<string, Brain>;
	windows: Map<string, Window>;
	results: Played[];
	/** Residents who get a fresh context at their next turn. */
	reset: Set<string>;
	/** The side that started the running (or last) game, from `game_started`; "" before the first game. */
	startingSide: string;
}

const head = defineHead({
	id: "strategy-brain",
	summary: "A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing.",
	options,
	state: (): BrainState => ({ brains: new Map(), windows: new Map(), results: [], reset: new Set(), startingSide: "" }),
	events: {
		brain_written: Type.Object({
			team: Type.String(),
			game: Type.Integer({ description: "The game the retro followed; 0 for the brain before game 1." }),
			version: Type.Integer({ description: "From 1, per brain (per team, or the one shared brain)." }),
			author: Type.String(),
			words: Type.Integer(),
			hash: Type.String(),
			text: Type.String(),
		}),
		retro_started: Type.Object({ team: Type.String(), game: Type.Integer(), captain: Type.String() }),
		retro_closed: Type.Object({ team: Type.String(), game: Type.Integer(), reason: Type.Union([Type.Literal("written"), Type.Literal("max_posts"), Type.Literal("timeout")]) }),
	},
	audiences: { brain_written: ["human"] },
	provides: [StrategyBrainApi],
	uses: [GridGameApi, BrainSourceApi, TeamChannelApi],
	prompts: {
		"strategy-brain/tools/readBrain": [],
		"strategy-brain/tools/writeBrain": [],
		"strategy-brain/empty": [],
		"strategy-brain/brain-text": ["version", "text"],
		"strategy-brain/written": ["version", "words"],
		"strategy-brain/briefing-head": ["game", "team", "first"],
		"strategy-brain/briefing-results": ["results"],
		"strategy-brain/briefing-none": [],
		"strategy-brain/briefing-brain": ["version", "text"],
		"strategy-brain/briefing-nobrain": [],
		"strategy-brain/retro-open": ["game", "result", "captain", "words", "aim", "lines", "posts"],
		"strategy-brain/retro-start": ["captain", "words", "aim", "lines", "posts"],
		"strategy-brain/retro-current": ["text"],
		"strategy-brain/retro-captain": [],
		"strategy-brain/briefing-head-solo": ["game"],
		"strategy-brain/empty-solo": [],
		"strategy-brain/briefing-brain-solo": ["version", "text"],
		"strategy-brain/briefing-nobrain-solo": [],
		"strategy-brain/retro-open-solo": ["game", "result", "words", "aim", "lines"],
		"strategy-brain/retro-start-solo": ["words", "aim", "lines"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;

function teamOf(ctx: Ctx, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return Object.entries(ctx.options.teams).find(([, members]) => members.includes(resident))?.[0];
}

const keyOf = (ctx: Ctx, team: string): string => (ctx.options.shared ? "*" : team);

function resultText(played: Played): string {
	if (played.summary !== undefined) return `game ${String(played.game)}: ${played.summary}`;
	return played.result === "draw" ? `game ${String(played.game)}: draw` : `game ${String(played.game)}: ${played.result} won`;
}

/** The game's number, from the game that provides one (a brain-source first, else the grid game). */
function gameOf(ctx: Ctx): number {
	return ctx.tryCall(BrainSourceApi, "game", {}) ?? ctx.tryCall(GridGameApi, "game", {}) ?? 0;
}

function holdGame(ctx: Ctx): boolean {
	return ctx.tryCall(BrainSourceApi, "hold", {}) ?? ctx.tryCall(GridGameApi, "hold", {}) ?? false;
}

function releaseGame(ctx: Ctx): void {
	if (ctx.has(BrainSourceApi)) ctx.tryCall(BrainSourceApi, "release", {});
	else ctx.tryCall(GridGameApi, "release", {});
}

/** A game started: every team member gets a fresh context with the briefing at the next turn. */
function noteGameStarted(ctx: Ctx, startingSide: string): void {
	ctx.state.startingSide = startingSide;
	for (const members of Object.values(ctx.options.teams)) for (const member of members) ctx.state.reset.add(member);
}

/** Whether `team` keeps a brain: the mechanic is enabled and the team is among `brainTeams` (default all). */
const hasBrain = (ctx: Ctx, team: string): boolean => ctx.options.enabled && (ctx.options.brainTeams === undefined || ctx.options.brainTeams.includes(team));

/** Whether a retro window would open for at least one team (a team needs a captain). */
const hasRetroTeam = (ctx: Ctx): boolean => Object.entries(ctx.options.teams).some(([team, members]) => members.length > 0 && hasBrain(ctx, team));

/** Holds the next game back and opens the windows, but only when at least one window opens: nothing would release the hold otherwise. */
function holdForRetro(ctx: Ctx, game: number): void {
	if (!ctx.options.enabled || !hasRetroTeam(ctx)) return;
	if (holdGame(ctx)) openWindows(ctx, game);
}

function openWindows(ctx: Ctx, game: number): void {
	for (const [team, members] of Object.entries(ctx.options.teams)) {
		if (!hasBrain(ctx, team)) continue;
		const captain = members[game % members.length];
		if (captain === undefined) continue;
		ctx.state.windows.set(team, { game, captain, opened: ctx.minute, posts: 0, told: [] });
		ctx.access.unlock(captain, WRITE);
		ctx.tryCall(TeamChannelApi, "resetCap", { team });
		ctx.emit("retro_started", { team, game, captain });
	}
}

function closeWindow(ctx: Ctx, team: string, reason: "written" | "max_posts" | "timeout"): void {
	const window = ctx.state.windows.get(team);
	if (window === undefined) return;
	ctx.state.windows.delete(team);
	ctx.access.lock(window.captain, WRITE);
	ctx.emit("retro_closed", { team, game: window.game, reason });
	if (ctx.state.windows.size === 0) releaseGame(ctx);
}

/** Why `resident` may not write `text` now, or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined, text: string) {
	if (!ctx.options.enabled) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	if (!hasBrain(ctx, team)) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
	const window = ctx.state.windows.get(team);
	if (window === undefined) return refuse("NO_RETRO", "The brain can only be written in the retro window between games.");
	if (resident !== window.captain) return refuse("NOT_RETRO_CAPTAIN", `Only the retro captain (${window.captain}) writes the brain.`);
	const words = wordCount(text);
	if (words === 0) return refuse("BRAIN_EMPTY", "The brain may not be empty.");
	if (words > ctx.options.maxWords) return refuse("BRAIN_TOO_LONG", `The brain has ${String(words)} words; the limit is ${String(ctx.options.maxWords)}.`);
	const replayed = ctx.state.results.find((played) => replaysMoves(text, played.moves, MIN_REPLAY_MOVES) || (played.line !== undefined && replaysLine(text, played.line, MIN_REPLAY_LINE)));
	if (replayed !== undefined) return refuse("BRAIN_REPLAY", `The text replays the moves of game ${String(replayed.game)}. Write rules keyed to positions, not one game's move list.`);
	return undefined;
}

function briefing(ctx: Ctx, resident: string): string {
	const team = teamOf(ctx, resident) ?? "";
	const first = ctx.state.startingSide;
	const game = gameOf(ctx);
	const lines = [
		ctx.options.solo ? ctx.prompt("strategy-brain/briefing-head-solo", { game }) : ctx.prompt("strategy-brain/briefing-head", { game, team, first }),
		ctx.state.results.length === 0 ? ctx.prompt("strategy-brain/briefing-none", {}) : ctx.prompt("strategy-brain/briefing-results", { results: ctx.state.results.map(resultText).join("; ") }),
	];
	if (hasBrain(ctx, team)) {
		const brain = ctx.state.brains.get(keyOf(ctx, team));
		const own = ctx.options.solo ? "strategy-brain/briefing-brain-solo" : "strategy-brain/briefing-brain";
		lines.push(brain === undefined ? ctx.prompt(ctx.options.solo ? "strategy-brain/empty-solo" : "strategy-brain/empty", {}) : ctx.prompt(own, { version: brain.version, text: brain.text }));
	} else {
		lines.push(ctx.options.solo ? ctx.prompt("strategy-brain/briefing-nobrain-solo", {}) : ctx.prompt("strategy-brain/briefing-nobrain", {}));
	}
	return lines.join("\n");
}

function retroLines(ctx: Ctx, resident: string, team: string, window: Window): string[] {
	// P120: models overrun a word cap by 5-20 words; a lower aim and a line count keep them under it.
	const aim = Math.max(1, Math.floor(ctx.options.maxWords * 0.8));
	const lineCount = Math.max(2, Math.round(aim / 12));
	const vars = { captain: window.captain, words: ctx.options.maxWords, aim, lines: lineCount, posts: ctx.options.retroMaxPosts };
	const last = ctx.state.results.find((played) => played.game === window.game);
	const first = window.game === 0 || last === undefined;
	const lines = ctx.options.solo
		? [first ? ctx.prompt("strategy-brain/retro-start-solo", { words: vars.words, aim, lines: lineCount }) : ctx.prompt("strategy-brain/retro-open-solo", { game: window.game, result: resultText(last), words: vars.words, aim, lines: lineCount })]
		: [first ? ctx.prompt("strategy-brain/retro-start", vars) : ctx.prompt("strategy-brain/retro-open", { game: window.game, result: resultText(last), ...vars })];
	if (ctx.options.retroFocus !== "") lines[0] = `${lines[0] ?? ""} ${ctx.options.retroFocus}`;
	const brain = ctx.state.brains.get(keyOf(ctx, team));
	if (brain !== undefined) lines.push(ctx.prompt("strategy-brain/retro-current", { text: brain.text }));
	if (resident === window.captain && !ctx.options.solo) lines.push(ctx.prompt("strategy-brain/retro-captain", {}));
	return lines;
}

const Saved = Type.Object({
	brains: Type.Record(Type.String(), Type.Object({ version: Type.Integer(), text: Type.String() })),
	windows: Type.Record(Type.String(), Type.Object({ game: Type.Integer(), captain: Type.String(), opened: Type.Integer(), posts: Type.Integer(), told: Type.Array(Type.String()) })),
	results: Type.Array(Type.Object({ game: Type.Integer(), result: Type.String(), moves: Type.Array(Type.Integer()), summary: Type.Optional(Type.String()), line: Type.Optional(Type.Array(Type.Array(Type.String()))) })),
	reset: Type.Array(Type.String()),
	startingSide: Type.Optional(Type.String()),
});

export const strategyBrain = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "readBrain",
			description: "strategy-brain/tools/readBrain",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => {
				if (!ctx.options.enabled) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
				const team = teamOf(ctx, ctx.resident);
				if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				if (!hasBrain(ctx, team)) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
				const brain = ctx.state.brains.get(keyOf(ctx, team));
				return reply(brain === undefined ? ctx.prompt(ctx.options.solo ? "strategy-brain/empty-solo" : "strategy-brain/empty", {}) : ctx.prompt("strategy-brain/brain-text", { version: brain.version, text: brain.text }));
			},
		}),
		kit.tool({
			name: WRITE,
			description: "strategy-brain/tools/writeBrain",
			parameters: Type.Object({ text: Type.String() }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, params.text),
			execute: (params, ctx: ToolCtx) => {
				const refusal = problemWith(ctx, ctx.resident, params.text);
				if (refusal !== undefined) return refusal;
				const team = teamOf(ctx, ctx.resident);
				const window = team === undefined ? undefined : ctx.state.windows.get(team);
				if (team === undefined || window === undefined || ctx.resident === undefined) return refuse("NO_RETRO", "The brain can only be written in the retro window between games.");
				const key = keyOf(ctx, team);
				const version = (ctx.state.brains.get(key)?.version ?? 0) + 1;
				const text = params.text.trim();
				const words = wordCount(text);
				ctx.state.brains.set(key, { version, text });
				ctx.emit("brain_written", { team, game: window.game, version, author: ctx.resident, words, hash: hashText(text), text });
				closeWindow(ctx, team, "written");
				return reply(ctx.prompt("strategy-brain/written", { version, words }));
			},
		}),
	],
	services: [
		kit.provide(StrategyBrainApi, {
			gameStarted: ({ first }, ctx) => {
				noteGameStarted(ctx, first);
				return null;
			},
			gameEnded: ({ game, summary, moves, line }, ctx) => {
				ctx.state.results.push({ game, result: "", moves: [...(moves ?? [])], summary, ...(line === undefined ? {} : { line: line.map((spellings) => [...spellings]) }) });
				holdForRetro(ctx, game);
				return null;
			},
		}),
	],
	pipeline: {
		// A seat whose team keeps no brain (a mixed table's control seats) has the brain tools closed for good, so they leave its open tools and its tools notice (P138).
		lock: (call, ctx) => {
			if (call.owner !== "strategy-brain" || (call.tool !== "readBrain" && call.tool !== WRITE)) return undefined;
			const team = teamOf(ctx, call.resident);
			return team !== undefined && !hasBrain(ctx, team) ? refuse("BRAIN_DISABLED", "This match keeps no strategy brain.") : undefined;
		},
		after: (call, outcome, ctx) => {
			if (call.tool !== ctx.options.postTool || !outcome.ok) return;
			const team = teamOf(ctx, call.resident);
			const window = team === undefined ? undefined : ctx.state.windows.get(team);
			if (window !== undefined) window.posts += 1;
		},
	},
	listeners: [
		kit.listen(GridGameEvents, "game_started", (payload, ctx) => {
			noteGameStarted(ctx, payload.startingSide);
		}),
		kit.listen(GridGameEvents, "game_ended", (payload, ctx) => {
			ctx.state.results.push({ game: payload.game, result: payload.result, moves: [...payload.moves] });
			holdForRetro(ctx, payload.game);
		}),
	],
	hooks: {
		runStarted: {
			// Before the grid game starts game 1, so the game can be held back.
			order: HOOK_ORDER.runStarted.strategyBrain,
			run: (ctx) => {
				if (!ctx.has(BrainSourceApi) && !ctx.has(GridGameApi)) throw new Error("strategy-brain: the story needs a game: grid-game, or a mechanic that provides brain-source");
				if (ctx.options.brainAtStart) holdForRetro(ctx, 0);
			},
		},
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.strategyBrain,
			run: (ctx) => {
				for (const team of ctx.state.windows.keys()) ctx.tryCall(TeamChannelApi, "resetCap", { team });
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.strategyBrain,
			run: (ctx) => {
				for (const [team, window] of [...ctx.state.windows]) {
					if (window.posts >= ctx.options.retroMaxPosts) closeWindow(ctx, team, "max_posts");
					else if (ctx.minute - window.opened + 1 >= ctx.options.retroMaxMinutes) closeWindow(ctx, team, "timeout");
				}
			},
		},
		news: (resident, ctx) => {
			const team = teamOf(ctx, resident);
			return team !== undefined && ctx.state.windows.has(team);
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.strategyBrain,
			run: (resident, ctx) => {
				const lines: (string | { readonly kind: string; readonly text: string })[] = [];
				if (ctx.state.reset.delete(resident)) lines.push({ kind: "context-reset", text: briefing(ctx, resident) });
				const team = teamOf(ctx, resident);
				const window = team === undefined ? undefined : ctx.state.windows.get(team);
				if (team !== undefined && window !== undefined && !window.told.includes(resident)) {
					window.told.push(resident);
					lines.push(...retroLines(ctx, resident, team, window));
				}
				return lines;
			},
		},
	},
	facts: {
		brains: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries([...view.state.brains].map(([key, brain]) => [key, brain.version]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Saved,
		save: (state) => ({
			brains: Object.fromEntries([...state.brains].map(([key, brain]) => [key, { ...brain }])),
			windows: Object.fromEntries([...state.windows].map(([team, window]) => [team, { ...window, told: [...window.told] }])),
			results: state.results.map((played) => ({ game: played.game, result: played.result, moves: [...played.moves], ...(played.summary === undefined ? {} : { summary: played.summary }), ...(played.line === undefined ? {} : { line: played.line.map((spellings) => [...spellings]) }) })),
			reset: [...state.reset].sort(),
			startingSide: state.startingSide,
		}),
		load: (data) => ({
			brains: new Map(Object.entries(data.brains).map(([key, brain]) => [key, { ...brain }])),
			windows: new Map(Object.entries(data.windows).map(([team, window]) => [team, { ...window, told: [...window.told] }])),
			results: data.results.map((played) => ({ ...played, moves: [...played.moves], ...(played.line === undefined ? {} : { line: played.line.map((spellings) => [...spellings]) }) })),
			reset: new Set(data.reset),
			startingSide: data.startingSide ?? "",
		}),
	}),
}));

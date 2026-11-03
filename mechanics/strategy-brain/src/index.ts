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
 * It reads the board's words only through the grid-game's events and API.
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { GridGameApi, GridGameEvents } from "@swarmtales/mechanic-grid-game";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import { hashText, replaysMoves, wordCount } from "./text.ts";

export { hashText, replaysMoves, wordCount } from "./text.ts";

const WRITE = "writeBrain";
/** A game with fewer moves than this is too short to count as "a game's move list". */
const MIN_REPLAY_MOVES = 5;

const options = Type.Object({
	enabled: Type.Boolean({ default: true, description: "false: no brain and no retro, only the result-only briefing at each game's start (the control arm)." }),
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
}

interface BrainState {
	brains: Map<string, Brain>;
	windows: Map<string, Window>;
	results: Played[];
	/** Residents who get a fresh context at their next turn. */
	reset: Set<string>;
}

const head = defineHead({
	id: "strategy-brain",
	summary: "A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing.",
	options,
	state: (): BrainState => ({ brains: new Map(), windows: new Map(), results: [], reset: new Set() }),
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
	requires: [GridGameApi],
	uses: [TeamChannelApi],
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
		"strategy-brain/retro-open": ["game", "result", "captain", "words", "posts"],
		"strategy-brain/retro-start": ["captain", "words", "posts"],
		"strategy-brain/retro-current": ["text"],
		"strategy-brain/retro-captain": [],
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
	return played.result === "draw" ? `game ${String(played.game)}: draw` : `game ${String(played.game)}: ${played.result} won`;
}

function openWindows(ctx: Ctx, game: number): void {
	for (const [team, members] of Object.entries(ctx.options.teams)) {
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
	if (ctx.state.windows.size === 0) ctx.call(GridGameApi, "release", {});
}

/** Why `resident` may not write `text` now, or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined, text: string) {
	if (!ctx.options.enabled) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	const window = ctx.state.windows.get(team);
	if (window === undefined) return refuse("NO_RETRO", "The brain can only be written in the retro window between games.");
	if (resident !== window.captain) return refuse("NOT_RETRO_CAPTAIN", `Only the retro captain (${window.captain}) writes the brain.`);
	const words = wordCount(text);
	if (words === 0) return refuse("BRAIN_EMPTY", "The brain may not be empty.");
	if (words > ctx.options.maxWords) return refuse("BRAIN_TOO_LONG", `The brain has ${String(words)} words; the limit is ${String(ctx.options.maxWords)}.`);
	const replayed = ctx.state.results.find((played) => replaysMoves(text, played.moves, MIN_REPLAY_MOVES));
	if (replayed !== undefined) return refuse("BRAIN_REPLAY", `The text replays the moves of game ${String(replayed.game)}. Write rules keyed to positions, not one game's move list.`);
	return undefined;
}

function briefing(ctx: Ctx, resident: string): string {
	const team = teamOf(ctx, resident) ?? "";
	const first = ctx.call(GridGameApi, "side", {}) ?? "";
	const lines = [
		ctx.prompt("strategy-brain/briefing-head", { game: ctx.call(GridGameApi, "game", {}), team, first }),
		ctx.state.results.length === 0 ? ctx.prompt("strategy-brain/briefing-none", {}) : ctx.prompt("strategy-brain/briefing-results", { results: ctx.state.results.map(resultText).join("; ") }),
	];
	if (ctx.options.enabled) {
		const brain = ctx.state.brains.get(keyOf(ctx, team));
		lines.push(brain === undefined ? ctx.prompt("strategy-brain/empty", {}) : ctx.prompt("strategy-brain/briefing-brain", { version: brain.version, text: brain.text }));
	} else {
		lines.push(ctx.prompt("strategy-brain/briefing-nobrain", {}));
	}
	return lines.join("\n");
}

function retroLines(ctx: Ctx, resident: string, team: string, window: Window): string[] {
	const vars = { captain: window.captain, words: ctx.options.maxWords, posts: ctx.options.retroMaxPosts };
	const last = ctx.state.results.find((played) => played.game === window.game);
	const lines = [window.game === 0 || last === undefined ? ctx.prompt("strategy-brain/retro-start", vars) : ctx.prompt("strategy-brain/retro-open", { game: window.game, result: resultText(last), ...vars })];
	const brain = ctx.state.brains.get(keyOf(ctx, team));
	if (brain !== undefined) lines.push(ctx.prompt("strategy-brain/retro-current", { text: brain.text }));
	if (resident === window.captain) lines.push(ctx.prompt("strategy-brain/retro-captain", {}));
	return lines;
}

const Saved = Type.Object({
	brains: Type.Record(Type.String(), Type.Object({ version: Type.Integer(), text: Type.String() })),
	windows: Type.Record(Type.String(), Type.Object({ game: Type.Integer(), captain: Type.String(), opened: Type.Integer(), posts: Type.Integer(), told: Type.Array(Type.String()) })),
	results: Type.Array(Type.Object({ game: Type.Integer(), result: Type.String(), moves: Type.Array(Type.Integer()) })),
	reset: Type.Array(Type.String()),
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
				const brain = ctx.state.brains.get(keyOf(ctx, team));
				return reply(brain === undefined ? ctx.prompt("strategy-brain/empty", {}) : ctx.prompt("strategy-brain/brain-text", { version: brain.version, text: brain.text }));
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
	pipeline: {
		after: (call, outcome, ctx) => {
			if (call.tool !== ctx.options.postTool || !outcome.ok) return;
			const team = teamOf(ctx, call.resident);
			const window = team === undefined ? undefined : ctx.state.windows.get(team);
			if (window !== undefined) window.posts += 1;
		},
	},
	listeners: [
		kit.listen(GridGameEvents, "game_started", (_payload, ctx) => {
			for (const members of Object.values(ctx.options.teams)) for (const member of members) ctx.state.reset.add(member);
		}),
		kit.listen(GridGameEvents, "game_ended", (payload, ctx) => {
			ctx.state.results.push({ game: payload.game, result: payload.result, moves: [...payload.moves] });
			if (ctx.options.enabled && ctx.call(GridGameApi, "hold", {})) openWindows(ctx, payload.game);
		}),
	],
	hooks: {
		runStarted: {
			// Before the grid game starts game 1 (its plain, order 0 phase), so the game can be held back.
			order: -100,
			run: (ctx) => {
				if (!ctx.options.enabled || !ctx.options.brainAtStart || Object.keys(ctx.options.teams).length === 0) return;
				if (ctx.call(GridGameApi, "hold", {})) openWindows(ctx, 0);
			},
		},
		minuteStarted: (ctx) => {
			for (const team of ctx.state.windows.keys()) ctx.tryCall(TeamChannelApi, "resetCap", { team });
		},
		minuteEnded: (ctx) => {
			for (const [team, window] of [...ctx.state.windows]) {
				if (window.posts >= ctx.options.retroMaxPosts) closeWindow(ctx, team, "max_posts");
				else if (ctx.minute - window.opened + 1 >= ctx.options.retroMaxMinutes) closeWindow(ctx, team, "timeout");
			}
		},
		news: (resident, ctx) => {
			const team = teamOf(ctx, resident);
			return team !== undefined && ctx.state.windows.has(team);
		},
		turnInputs: (resident, ctx) => {
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
	facts: {
		brains: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries([...view.state.brains].map(([key, brain]) => [key, brain.version]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Saved,
		save: (state) => ({
			brains: Object.fromEntries([...state.brains].map(([key, brain]) => [key, { ...brain }])),
			windows: Object.fromEntries([...state.windows].map(([team, window]) => [team, { ...window, told: [...window.told] }])),
			results: state.results.map((played) => ({ game: played.game, result: played.result, moves: [...played.moves] })),
			reset: [...state.reset].sort(),
		}),
		load: (data) => ({
			brains: new Map(Object.entries(data.brains).map(([key, brain]) => [key, { ...brain }])),
			windows: new Map(Object.entries(data.windows).map(([team, window]) => [team, { ...window, told: [...window.told] }])),
			results: data.results.map((played) => ({ ...played, moves: [...played.moves] })),
			reset: new Set(data.reset),
		}),
	}),
}));

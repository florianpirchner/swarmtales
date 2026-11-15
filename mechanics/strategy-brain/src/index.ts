// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `strategy-brain` mechanic: one short free text per team (or one shared text), carried from game
 * to game in place of the residents' conversation. It is the only cross-game memory of a match:
 * - at a game's start every resident gets a `context-reset` turn line (docs/design/context-reset.md)
 *   with a briefing of the game's number, the sides, the results so far (result only, never moves; left
 *   out with `showResults: false`, so that the results are no second memory beside the brain) and,
 *   when the brain is `enabled`, the team's brain. `enabled: false` gives the identical briefing minus
 *   the brain, so the brain is the only difference between two arms;
 * - after each game but the last (and before the first when `brainAtStart`) a retro window holds the
 *   next game back (`GridGameService.hold`). Only the retro captain of a team (rotating by game) may call
 *   `writeBrain`, at most `maxWords` words, and not as a replay of one game's move list. The window of
 *   a team closes when the text is written, or at a minute's end when its members made `retroMaxPosts`
 *   team posts, or after `retroMaxMinutes` minutes; when every window is closed the game is released;
 * - every version is the event `brain_written` (audience `human`, so a gamemaker never reads it).
 * It reads the board's words only through the grid-game's events and service. A game other than the grid
 * game provides `BrainSourceService` (game number, hold, release) and calls `StrategyBrainService` when a game
 * starts or ends; with `solo` every team is one resident, and the briefings and retro lines say so.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { InputLine, Refusal } from "@swarmtales/contracts";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { GridGameEvents, GridGameService } from "@swarmtales/mechanic-grid-game/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { strategyBrainHead, type Played, type StrategyBrainCtx, type Window } from "./head.ts";
import { hashText, replaysLine, replaysMoves, wordCount } from "./text.ts";

const WRITE = "writeBrain";
// A game with fewer moves than this is too short to count as "a game's move list".
const MIN_REPLAY_MOVES = 5;
// A run of this many half-moves of a game whose moves are text (chess) counts as a replay.
const MIN_REPLAY_LINE = 8;

type Ctx = StrategyBrainCtx;
/** The share of the times the fake driver (`--fake`) is asked in which it reads the brain. */
const FAKE_RATE = 0.125;
/** What the fake driver writes as a brain: one short rule that names no move, so it is no replay of a game. */
const FAKE_BRAINS = ["Look at the whole table before every decision.", "Keep what paid in the last game and drop what cost points.", "Decide early and do not wait for the deadline."];

function teamOf(ctx: Ctx, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return Object.entries(ctx.options.teams).find(([, members]) => members.includes(resident))?.[0];
}

const keyOf = (ctx: Ctx, team: string): string => (ctx.options.shared ? "*" : team);

function resultText(played: Played): string {
	if (played.summary !== undefined) return `game ${String(played.game)}: ${played.summary}`;
	return played.result === "draw" ? `game ${String(played.game)}: draw` : `game ${String(played.game)}: ${played.result} won`;
}

// The game's number, from the game that provides one (a brain-source first, else the grid game).
function gameOf(ctx: Ctx): number {
	return ctx.tryCall(BrainSourceService, "game", {}) ?? ctx.tryCall(GridGameService, "game", {}) ?? 0;
}

function holdGame(ctx: Ctx): boolean {
	return ctx.tryCall(BrainSourceService, "hold", {}) ?? ctx.tryCall(GridGameService, "hold", {}) ?? false;
}

function releaseGame(ctx: Ctx): void {
	if (ctx.has(BrainSourceService)) ctx.tryCall(BrainSourceService, "release", {});
	else ctx.tryCall(GridGameService, "release", {});
}

// A game started: every team member gets a fresh context with the briefing at the next turn.
function noteGameStarted(ctx: Ctx, startingSide: string): void {
	ctx.state.startingSide = startingSide;
	for (const members of Object.values(ctx.options.teams)) for (const member of members) ctx.state.reset.add(member);
}

// Whether `team` keeps a brain: the mechanic is enabled and the team is among `brainTeams` (default all).
const hasBrain = (ctx: Ctx, team: string): boolean => ctx.options.enabled && (ctx.options.brainTeams === undefined || ctx.options.brainTeams.includes(team));

// Whether a retro window would open for at least one team (a team needs a captain).
const hasRetroTeam = (ctx: Ctx): boolean => Object.entries(ctx.options.teams).some(([team, members]) => members.length > 0 && hasBrain(ctx, team));

// Holds the next game back and opens the windows, but only when at least one window opens: nothing would release the hold otherwise.
function holdForRetro(ctx: Ctx, game: number): void {
	if (!ctx.options.enabled || !hasRetroTeam(ctx)) return;
	if (holdGame(ctx)) openWindows(ctx, game);
}

function openWindows(ctx: Ctx, game: number): void {
	for (const [team, members] of Object.entries(ctx.options.teams)) {
		if (!hasBrain(ctx, team)) continue;
		const captain = members[game % members.length];
		if (captain === undefined) continue;
		ctx.state.windows.set(team, { game, captain, opened: ctx.tick, posts: 0, told: [] });
		ctx.access.unlock(captain, WRITE);
		ctx.tryCall(TeamChannelService, "resetCap", { team });
		ctx.emit("retro_started", { team, game, captain });
	}
}

// The teams with an open window, in the order of the option `teams`: the order the windows open in, and one that a
// snapshot file (keys sorted) cannot change, so a resumed run calls and closes in the straight run's order (A43).
const windowTeams = (ctx: Ctx): string[] => Object.keys(ctx.options.teams).filter((team) => ctx.state.windows.has(team));

function closeWindow(ctx: Ctx, team: string, reason: "written" | "max_posts" | "timeout"): void {
	const window = ctx.state.windows.get(team);
	if (window === undefined) return;
	ctx.state.windows.delete(team);
	ctx.access.lock(window.captain, WRITE);
	ctx.emit("retro_closed", { team, game: window.game, reason });
	if (ctx.state.windows.size === 0) releaseGame(ctx);
}

// The detail of `BRAIN_TOO_LONG`: the old text, and with `tooLongDetail: "cut"` how many words to cut (P446).
function tooLongDetail(ctx: Ctx, words: number): string {
	const detail = `The brain has ${String(words)} words; the limit is ${String(ctx.options.maxWords)}.`;
	return ctx.options.tooLongDetail === "cut" ? `${detail} Cut at least ${String(words - ctx.options.maxWords)} words.` : detail;
}

// Why `text` may not become a brain, or undefined: empty, too long, too many rules, or the replay of a game.
function textProblem(ctx: Ctx, text: string): Refusal | undefined {
	const words = wordCount(text);
	if (words === 0) return refuse("BRAIN_EMPTY", "The brain may not be empty.");
	if (words > ctx.options.maxWords) return refuse("BRAIN_TOO_LONG", tooLongDetail(ctx, words));
	if (ctx.options.maxRules > 0) {
		const rules = text.split("\n").filter((row) => row.trim() !== "").length;
		if (rules > ctx.options.maxRules) return refuse("BRAIN_TOO_MANY_RULES", `The brain has ${String(rules)} lines; at most ${String(ctx.options.maxRules)} rules, one per line. Replace an old rule instead of adding one.`);
	}
	const replayed = ctx.state.results.find((played) => replaysMoves(text, played.moves, MIN_REPLAY_MOVES) || (played.line !== undefined && replaysLine(text, played.line, MIN_REPLAY_LINE)));
	if (replayed !== undefined) return refuse("BRAIN_REPLAY", `The text replays the moves of game ${String(replayed.game)}. Write rules keyed to positions, not one game's move list.`);
	return undefined;
}

// Why `resident` may not write `text` now, or undefined.
function problemWith(ctx: Ctx, resident: string | undefined, text: string): Refusal | undefined {
	if (!ctx.options.enabled) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
	const team = teamOf(ctx, resident);
	if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
	if (!hasBrain(ctx, team)) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
	const window = ctx.state.windows.get(team);
	if (window === undefined) return refuse("NO_RETRO", "The brain can only be written in the retro window between games.");
	if (resident !== window.captain) return refuse("NOT_RETRO_CAPTAIN", `Only the retro captain (${window.captain}) writes the brain.`);
	return textProblem(ctx, text);
}

// The second line of a briefing: that no game was played yet, or the results so far; none when `showResults` is false and a game was played (LH19).
function resultsLine(ctx: Ctx): string[] {
	if (ctx.state.results.length === 0) return [ctx.prompt("strategy-brain/briefing-none", {})];
	return ctx.options.showResults === false ? [] : [ctx.prompt("strategy-brain/briefing-results", { results: ctx.state.results.map(resultText).join("; ") })];
}

function briefing(ctx: Ctx, resident: string): string {
	const team = teamOf(ctx, resident) ?? "";
	const first = ctx.state.startingSide;
	const game = gameOf(ctx);
	const lines = [
		ctx.options.solo ? ctx.prompt("strategy-brain/briefing-head-solo", { game }) : ctx.prompt("strategy-brain/briefing-head", { game, team, first }),
		...resultsLine(ctx),
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

// The first line of a retro window: the opening (the first one when no game was played before it), then the rule limit and the game's own focus.
function retroOpening(ctx: Ctx, window: Window, last: Played | undefined): string {
	// P120: models overrun a word cap by 5-20 words; a lower aim and a line count keep them under it.
	const aim = Math.max(1, Math.floor(ctx.options.maxWords * 0.8));
	const lineCount = Math.max(2, Math.round(aim / 12));
	const vars = { captain: window.captain, words: ctx.options.maxWords, aim, lines: lineCount, posts: ctx.options.retroMaxPosts };
	const solo = { words: vars.words, aim, lines: lineCount };
	const opening =
		last === undefined
			? ctx.options.solo
				? ctx.prompt("strategy-brain/retro-start-solo", solo)
				: ctx.prompt("strategy-brain/retro-start", vars)
			: ctx.options.solo
				? ctx.prompt("strategy-brain/retro-open-solo", { game: window.game, result: resultText(last), ...solo })
				: ctx.prompt("strategy-brain/retro-open", { game: window.game, result: resultText(last), ...vars });
	const rules = ctx.options.maxRules > 0 ? ` ${ctx.prompt("strategy-brain/retro-rules", { rules: ctx.options.maxRules })}` : "";
	return `${opening}${rules}${ctx.options.retroFocus !== "" ? ` ${ctx.options.retroFocus}` : ""}`;
}

function retroLines(ctx: Ctx, resident: string, team: string, window: Window): string[] {
	// The window before game 1 follows no game, and neither does one whose game left no result.
	const last = window.game === 0 ? undefined : ctx.state.results.find((played) => played.game === window.game);
	const lines = [retroOpening(ctx, window, last)];
	const review = last?.review?.[team];
	if (review !== undefined) lines.push(ctx.prompt("strategy-brain/retro-review", { text: review }));
	const brain = ctx.state.brains.get(keyOf(ctx, team));
	if (brain !== undefined) lines.push(ctx.prompt("strategy-brain/retro-current", { text: brain.text }));
	if (resident === window.captain && !ctx.options.solo) lines.push(ctx.prompt("strategy-brain/retro-captain", {}));
	return lines;
}

/**
 * The strategy brain: a bounded, versioned text per team, written in a retro window between games.
 *
 * @example
 * ```ts
 * const brain = strategyBrain({ teams: { X: ["A01", "A02"], O: ["A03", "A04"] }, maxWords: 200 });
 * ```
 *
 * @public
 */
export const strategyBrain = defineMechanic(strategyBrainHead, {
	tools: {
		readBrain: {
			sample: (ctx, random) => (ctx.options.enabled && hasBrain(ctx, teamOf(ctx, ctx.resident) ?? "") && random.next() < FAKE_RATE ? {} : undefined),
			run: (_params, ctx) => {
				if (!ctx.options.enabled) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
				const team = teamOf(ctx, ctx.resident);
				if (team === undefined) return refuse("NOT_TEAM_MEMBER", "you are in no team");
				if (!hasBrain(ctx, team)) return refuse("BRAIN_DISABLED", "This match keeps no strategy brain.");
				const brain = ctx.state.brains.get(keyOf(ctx, team));
				return reply(brain === undefined ? ctx.prompt(ctx.options.solo ? "strategy-brain/empty-solo" : "strategy-brain/empty", {}) : ctx.prompt("strategy-brain/brain-text", { version: brain.version, text: brain.text }));
			},
		},
		[WRITE]: {
			check: (params, ctx) => problemWith(ctx, ctx.resident, params.text),
			// The retro captain writes in its window, one of the fixed rules that the options allow (a cap of a few words allows none).
			sample: (ctx, random) => {
				const texts = FAKE_BRAINS.filter((text) => problemWith(ctx, ctx.resident, text) === undefined);
				return texts.length === 0 ? undefined : { text: random.pick(texts) };
			},
			run: (params, ctx) => {
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
				return reply(ctx.prompt("strategy-brain/written", { version, words }), { endsTurn: ctx.options.quietEnds === true });
			},
		},
	},
	services: {
		"strategy-brain": {
			gameStarted: ({ first }, ctx) => {
				noteGameStarted(ctx, first);
				return null;
			},
			briefing: ({ resident }, ctx) => briefing(ctx, resident),
			gameEnded: ({ game, summary, moves, line, review }, ctx) => {
				ctx.state.results.push({ game, result: "", moves: [...(moves ?? [])], summary, ...(line === undefined ? {} : { line: line.map((spellings) => [...spellings]) }), ...(review === undefined ? {} : { review: { ...review } }) });
				holdForRetro(ctx, game);
				return null;
			},
		},
	},
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
	listeners: (kit) => [
		kit.listen(GridGameEvents, "game_started", (payload, ctx) => {
			noteGameStarted(ctx, payload.startingSide);
		}),
		kit.listen(GridGameEvents, "game_ended", (payload, ctx) => {
			ctx.state.results.push({ game: payload.game, result: payload.result, moves: [...payload.moves] });
			holdForRetro(ctx, payload.game);
		}),
	],
	hooks: {
		// Before the grid game starts game 1, so the game can be held back: the grid game's hook runs `after` this one.
		runStarted: (ctx) => {
			if (!ctx.has(BrainSourceService) && !ctx.has(GridGameService)) throw new RangeError("strategy-brain: the story needs a game: grid-game, or a mechanic that provides brain-source");
			if (ctx.options.brainAtStart) holdForRetro(ctx, 0);
		},
		tickStarted: (ctx) => {
			for (const team of windowTeams(ctx)) ctx.tryCall(TeamChannelService, "resetCap", { team });
		},
		tickEnded: (ctx) => {
			for (const team of windowTeams(ctx)) {
				const window = ctx.state.windows.get(team);
				if (window === undefined) continue;
				if (window.posts >= ctx.options.retroMaxPosts) closeWindow(ctx, team, "max_posts");
				else if (ctx.tick - window.opened + 1 >= ctx.options.retroMaxMinutes) closeWindow(ctx, team, "timeout");
			}
		},
		news: (resident, ctx) => {
			const team = teamOf(ctx, resident);
			return team !== undefined && ctx.state.windows.has(team);
		},
		turnInputs: (resident, ctx) => {
			const lines: InputLine[] = [];
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
		brains: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => Object.fromEntries([...view.state.brains].map(([key, brain]) => [key, brain.version])) },
	},
});

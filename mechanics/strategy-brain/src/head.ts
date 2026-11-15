// SPDX-License-Identifier: Apache-2.0
/** The head of the `strategy-brain` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { defineHead, type CtxOf } from "@swarmtales/sdk";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { GridGameService } from "@swarmtales/mechanic-grid-game/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { StrategyBrainService } from "./contract.ts";
import { strategyBrainMetrics } from "./metrics.ts";

const options = Type.Object({
	enabled: Type.Boolean({ default: true, description: "false: no brain and no retro, only the result-only briefing at each game's start (the control arm)." }),
	brainTeams: Type.Optional(Type.Array(Type.String(), { description: "The teams that keep a brain (default: all teams). The others get the result-only briefing, no retro, and readBrain/writeBrain stay closed to them (BRAIN_DISABLED); an empty list equals enabled: false." })),
	maxWords: Type.Integer({ minimum: 1, default: 300, description: "The most words a brain may have." }),
	maxRules: Type.Integer({ minimum: 0, default: 0, description: "More than 0: the brain is a list of at most this many rules, one per line; a new rule has to replace an old one once the list is full (P210). 0: free text up to maxWords." }),
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
	tooLongDetail: Type.Optional(
		Type.Union([Type.Literal("plain"), Type.Literal("cut")], {
			description: "The detail of a BRAIN_TOO_LONG refusal: `plain` (also when absent) names the words and the limit, byte for byte as on the old platform; `cut` adds how many words to cut (P446).",
		}),
	),
	showResults: Type.Optional(Type.Boolean({ description: "false: the briefing of a later game leaves out the results of the earlier games, so a brain is the only thing a briefing carries from game to game (LH19). Shown when absent." })),
	quietEnds: Type.Optional(Type.Boolean({ description: "true: a written brain ends the writer's turn (`endsTurn`), so its answer alone wakes no turn with nothing to do (P474). Absent or false: the answer wakes the writer, as on the old platform." })),
});

/**
 * One brain: its version and its text.
 *
 * @public
 */
export interface Brain {
	version: number;
	text: string;
}

/**
 * One retro window of a team.
 *
 * @public
 */
export interface Window {
	game: number;
	captain: string;
	opened: number;
	posts: number;
	told: string[];
}

/**
 * One finished game as the brain keeps it.
 *
 * @public
 */
export interface Played {
	readonly game: number;
	readonly result: string;
	readonly moves: readonly number[];
	/** The game's own one-line result (`StrategyBrainApi.gameEnded`), shown in place of `result`. */
	readonly summary?: string;
	/** The game's moves as text with their spellings (`StrategyBrainApi.gameEnded`), for the replay check of a chess-like game. */
	readonly line?: readonly (readonly string[])[];
	/** A private review per team (`StrategyBrainApi.gameEnded`), shown only in that team's next retro. */
	readonly review?: Readonly<Record<string, string>>;
}

/**
 * The state of the strategy brain.
 *
 * @public
 */
export interface BrainState {
	brains: Map<string, Brain>;
	windows: Map<string, Window>;
	results: Played[];
	/** Residents who get a fresh context at their next turn. */
	reset: Set<string>;
	/** The side that started the running (or last) game, from `game_started`; "" before the first game. */
	startingSide: string;
}

const Saved = Type.Object({
	brains: Type.Record(Type.String(), Type.Object({ version: Type.Integer(), text: Type.String() })),
	windows: Type.Record(Type.String(), Type.Object({ game: Type.Integer(), captain: Type.String(), opened: Type.Integer(), posts: Type.Integer(), told: Type.Array(Type.String()) })),
	results: Type.Array(Type.Object({ game: Type.Integer(), result: Type.String(), moves: Type.Array(Type.Integer()), summary: Type.Optional(Type.String()), line: Type.Optional(Type.Array(Type.Array(Type.String()))), review: Type.Optional(Type.Record(Type.String(), Type.String())) })),
	reset: Type.Array(Type.String()),
	startingSide: Type.Optional(Type.String()),
});

// The event schemas stand outside the head so that the metrics are typed by them.
const events = {
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
};

/**
 * The event schemas of the strategy brain, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type StrategyBrainEvents = typeof events;

/**
 * The head of the strategy brain: everything that can be read without running a handler.
 *
 * @public
 */
export const strategyBrainHead = defineHead({
	id: "strategy-brain",
	package: "@swarmtales/mechanic-strategy-brain",
	summary: "A bounded, versioned text per team, written in a retro window between games and handed to the next game's briefing.",
	options,
	state: Saved,
	start: (): BrainState => ({ brains: new Map(), windows: new Map(), results: [], reset: new Set(), startingSide: "" }),
	snapshot: {
	save: (state: BrainState) => ({
		brains: Object.fromEntries([...state.brains].map(([key, brain]) => [key, { ...brain }])),
		windows: Object.fromEntries([...state.windows].map(([team, window]) => [team, { ...window, told: [...window.told] }])),
		results: state.results.map((played) => ({ game: played.game, result: played.result, moves: [...played.moves], ...(played.summary === undefined ? {} : { summary: played.summary }), ...(played.line === undefined ? {} : { line: played.line.map((spellings) => [...spellings]) }), ...(played.review === undefined ? {} : { review: { ...played.review } }) })),
		reset: [...state.reset].sort(),
		startingSide: state.startingSide,
	}),
	load: (data): BrainState => ({
		brains: new Map(Object.entries(data.brains).map(([key, brain]) => [key, { ...brain }])),
		windows: new Map(Object.entries(data.windows).map(([team, window]) => [team, { ...window, told: [...window.told] }])),
		results: data.results.map((played) => ({ ...played, moves: [...played.moves], ...(played.line === undefined ? {} : { line: played.line.map((spellings) => [...spellings]) }), ...(played.review === undefined ? {} : { review: { ...played.review } }) })),
		reset: new Set(data.reset),
		startingSide: data.startingSide ?? "",
	}),
	},
	events,
	metrics: strategyBrainMetrics(events),
	audiences: { brain_written: ["human"] },
	provides: [StrategyBrainService],
	uses: [GridGameService, BrainSourceService, TeamChannelService],
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
		"strategy-brain/retro-review": ["text"],
		"strategy-brain/retro-captain": [],
		"strategy-brain/briefing-head-solo": ["game"],
		"strategy-brain/empty-solo": [],
		"strategy-brain/briefing-brain-solo": ["version", "text"],
		"strategy-brain/briefing-nobrain-solo": [],
		"strategy-brain/retro-open-solo": ["game", "result", "words", "aim", "lines"],
		"strategy-brain/retro-start-solo": ["words", "aim", "lines"],
		"strategy-brain/retro-rules": ["rules"],
	},
	tools: {
		readBrain: { description: "strategy-brain/tools/readBrain", params: Type.Object({}), for: ["resident"] },
		writeBrain: { description: "strategy-brain/tools/writeBrain", params: Type.Object({ text: Type.String() }), for: ["resident"] },
	},
});

/**
 * The context of the strategy brain's hooks, listeners, services and pipeline handlers.
 *
 * @public
 */
export type StrategyBrainCtx = CtxOf<typeof strategyBrainHead>;

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `morris` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type, type Static } from "typebox";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { ConsensusAgreedService, ConsensusService } from "@swarmtales/mechanic-consensus/contract";
import { BrainSourceService, ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { MorrisEvents } from "./events.ts";
import { morrisMetrics } from "./metrics.ts";
import { copyOf, MorrisSlice, type MorrisState } from "./model.ts";
import { emptyBoard } from "./rules.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "How many games the match has; the run ends after the last one." }),
	pieces: Type.Integer({ minimum: 3, maximum: 12, default: 9, description: "Pieces per side (9 in nine men's morris)." }),
	flying: Type.Boolean({ default: true, description: "A side with three pieces left may move a piece to any free point." }),
	maxTurns: Type.Integer({ minimum: 1, default: 120, description: "Whole turns (both sides) after which a game is a draw." }),
	maxQuietTurns: Type.Integer({ minimum: 1, default: 40, description: "Whole turns without a mill, once both sides have placed every piece, after which a game is a draw." }),
	repetitions: Type.Integer({ minimum: 2, default: 3, description: "A game is a draw when the same position (with the same side to move) comes up this often." }),
	alternateStart: Type.Boolean({ default: true, description: "The starting side alternates from game to game (X starts game 1); false: X always starts." }),
	fixedCaptain: Type.Boolean({ default: false, description: "The first member of each team is its captain for the whole match; false: the captaincy rotates, one turn each." }),
	wakeTeam: Type.Boolean({ default: false, description: "With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain." }),
	teams: Type.Optional(
		Type.Object(
			{
				X: Type.Array(Type.String(), { description: "Resident ids of the X team, in the order their captaincy rotates (empty when the engine plays X)." }),
				O: Type.Array(Type.String(), { description: "Resident ids of the O team, in the order their captaincy rotates (empty when the engine plays O)." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half playing X (all of them play X when the engine plays O, and the other way round)." },
		),
	),
	engine: Type.Optional(
		Type.Object(
			{
				side: Type.Union([Type.Literal("X"), Type.Literal("O")], { description: "The side the engine plays; its team has no residents." }),
				depth: Type.Integer({ minimum: 1, maximum: 6, default: 3, description: "Whole turns the engine's search looks ahead at most." }),
				maxNodes: Type.Integer({ minimum: 1000, default: 200_000, description: "Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts." }),
			},
			{ description: "A scripted opponent: this side has no residents and plays the best turn of an alpha-beta search (ties broken by the seeded random), the moment it comes on move." },
		),
	),
});

type Options = Static<typeof options>;

interface Teams {
	X: string[];
	O: string[];
}

// The residents split in half, the first half playing X; all of them on the other side when the engine plays one.
function splitOf(engine: Options["engine"], residents: readonly string[]): Teams {
	const half = Math.ceil(residents.length / 2);
	return engine === undefined ? { X: residents.slice(0, half), O: residents.slice(half) } : engine.side === "X" ? { X: [], O: [...residents] } : { X: [...residents], O: [] };
}

// A side is empty exactly when the engine plays it.
function checkSide(side: "X" | "O", empty: boolean, engine: boolean): void {
	if (engine && !empty) throw new RangeError(`morris: the engine plays ${side}, so team ${side} must have no residents`);
	if (!engine && empty) throw new RangeError("morris: each team needs at least one resident");
}

// The two teams of the match: the option, or the split of the residents; refused when they do not fit the residents or the engine.
function teamsOf({ teams, engine }: Pick<Options, "teams" | "engine">, residents: readonly string[]): Teams {
	const chosen = teams ?? splitOf(engine, residents);
	const members = [...chosen.X, ...chosen.O];
	for (const side of ["X", "O"] as const) checkSide(side, chosen[side].length === 0, engine?.side === side);
	if (new Set(members).size !== members.length) throw new RangeError("morris: a resident may play in one team only");
	const unknown = members.find((id) => !residents.includes(id));
	if (unknown !== undefined) throw new RangeError(`morris: ${unknown} is not a resident of the run`);
	return chosen;
}

/**
 * The head of nine men's morris: everything that can be read without running a handler.
 *
 * @public
 */
export const morrisHead = defineHead({
	id: "morris",
	package: "@swarmtales/mechanic-morris",
	summary: "Nine men's morris between two teams: placing, moving and flying, mills and removals, the captain of the turn and a match of several games.",
	options,
	state: MorrisSlice,
	start: (setup): MorrisState => {
		const chosen = teamsOf(setup.options, setup.residents);
		const pieces = setup.options.pieces;
		return {
			teams: { X: [...chosen.X], O: [...chosen.O] },
			board: emptyBoard(),
			side: "X",
			inHand: { X: pieces, O: pieces },
			game: 0,
			startingSide: "X",
			moves: [],
			turnNo: 0,
			removing: false,
			quiet: 0,
			seen: {},
			taken: { X: 0, O: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: { save: (state: MorrisState) => copyOf(state), load: (data): MorrisState => copyOf(data) },
	events: MorrisEvents.events,
	metrics: morrisMetrics(MorrisEvents.events),
	provides: [ConsensusSourceService, BrainSourceService],
	uses: [ConsensusService, ConsensusAgreedService, TeamChannelService, StrategyBrainService],
	prompts: {
		"morris/tools/viewBoard": [],
		"morris/tools/playMove": [],
	},
	tools: {
		viewBoard: { description: "morris/tools/viewBoard", params: Type.Object({}), for: ["resident"] },
		playMove: {
			description: "morris/tools/playMove",
			params: Type.Object({ move: Type.Integer({ minimum: 1, description: "The move number: a point 1-24 to place on or to remove, or from * 100 + to to move a piece." }) }),
			for: ["resident"],
		},
	},
});

/**
 * The context of the morris hooks, jobs, services and tools.
 *
 * @public
 */
export type MorrisCtx = CtxOf<typeof morrisHead>;

/**
 * The read-only view of the morris facts and run limit.
 *
 * @public
 */
export type MorrisView = ViewOf<typeof morrisHead>;

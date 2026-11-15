// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `grid-game` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { defineHead, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { ConsensusAgreedService, ConsensusService } from "@swarmtales/mechanic-consensus/contract";
import { ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { GridGameEvents } from "./events.ts";
import { emptyBoard, GridSlice, type GridState } from "./model.ts";
import { GridGameService } from "./service.ts";

const options = Type.Object({
	size: Type.Integer({ minimum: 2, maximum: 10, default: 3, description: "The board is size x size cells." }),
	line: Type.Integer({ minimum: 2, maximum: 10, default: 3, description: "How many marks in a row (line, column or diagonal) win a game; at most the board size." }),
	games: Type.Integer({ minimum: 1, default: 3, description: "How many games the match has; the run ends after the last one." }),
	alternateStart: Type.Boolean({ default: true, description: "The starting side alternates from game to game (X starts game 1); false: X always starts." }),
	fixedCaptain: Type.Boolean({ default: false, description: "The first member of each team is its captain for the whole match; false: the captaincy rotates, one move each." }),
	wakeTeam: Type.Boolean({ default: false, description: "With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain." }),
	teams: Type.Optional(
		Type.Object(
			{
				X: Type.Array(Type.String(), { minItems: 1, description: "Resident ids of the X team, in the order their captaincy rotates." }),
				O: Type.Array(Type.String(), { minItems: 1, description: "Resident ids of the O team, in the order their captaincy rotates." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half playing X." },
		),
	),
});

/**
 * The head of the grid game: everything that can be read without running a handler.
 *
 * @public
 */
export const gridGameHead = defineHead({
	id: "grid-game",
	package: "@swarmtales/mechanic-grid-game",
	summary: "A board game between two teams: the board, the captain of the turn, win detection and a match of several games.",
	options,
	state: GridSlice,
	start: (setup): GridState => {
		const { size, line, teams } = setup.options;
		if (line > size) throw new RangeError(`grid-game: line ${String(line)} does not fit a board of ${String(size)}`);
		const half = Math.ceil(setup.residents.length / 2);
		const chosen = teams ?? { X: setup.residents.slice(0, half), O: setup.residents.slice(half) };
		const members = [...chosen.X, ...chosen.O];
		if (chosen.X.length === 0 || chosen.O.length === 0) throw new RangeError("grid-game: each team needs at least one resident");
		if (new Set(members).size !== members.length) throw new RangeError("grid-game: a resident may play in one team only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new RangeError(`grid-game: ${unknown} is not a resident of the run`);
		return {
			teams: { X: [...chosen.X], O: [...chosen.O] },
			board: emptyBoard(size),
			side: "X",
			game: 0,
			startingSide: "X",
			moves: [],
			taken: { X: 0, O: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: {
		save: (state: GridState) => ({
			teams: { X: [...state.teams.X], O: [...state.teams.O] },
			board: [...state.board],
			side: state.side,
			game: state.game,
			startingSide: state.startingSide,
			moves: [...state.moves],
			taken: { ...state.taken },
			results: state.results.map((result) => ({ ...result, moves: [...result.moves], ...(result.winLine === undefined ? {} : { winLine: [...result.winLine] }) })),
			running: state.running,
			finished: state.finished,
			held: state.held,
			due: state.due,
			...(state.invalid === true ? { invalid: true } : {}),
			...(state.told === undefined ? {} : { told: state.told }),
		}),
		load: (data): GridState => ({
			teams: { X: [...data.teams.X], O: [...data.teams.O] },
			board: [...data.board],
			side: data.side,
			game: data.game,
			startingSide: data.startingSide,
			moves: [...data.moves],
			taken: { ...data.taken },
			results: data.results.map((result) => ({ ...result })),
			running: data.running,
			finished: data.finished,
			held: data.held ?? false,
			due: data.due ?? false,
			...(data.invalid === true ? { invalid: true } : {}),
			...(data.told === undefined ? {} : { told: data.told }),
		}),
	},
	events: GridGameEvents.events,
	provides: [GridGameService, ConsensusSourceService],
	uses: [ConsensusService, ConsensusAgreedService, TeamChannelService],
	prompts: {
		"grid-game/tools/viewBoard": [],
		"grid-game/tools/playMove": [],
	},
	tools: {
		viewBoard: { description: "grid-game/tools/viewBoard", params: Type.Object({}), for: ["resident"] },
		playMove: { description: "grid-game/tools/playMove", params: Type.Object({ cell: Type.Integer({ minimum: 0, description: "The cell to mark, from 0, row by row." }) }), for: ["resident"] },
	},
});

/**
 * The context of the grid game's hooks, jobs and services.
 *
 * @public
 */
export type GridGameCtx = CtxOf<typeof gridGameHead>;

/**
 * The read-only view of the grid game's facts and run limit.
 *
 * @public
 */
export type GridGameView = ViewOf<typeof gridGameHead>;

// SPDX-License-Identifier: Apache-2.0
/**
 * The data of the puzzles mechanic: the options a game gives, the events it writes, the level state it keeps and
 * the snapshot slice. Ported from the old platform, cut to fragment levels.
 */
import { Type, type Static } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import type { FragmentPuzzle } from "./fragments.ts";
import type { Team, TeamPlanner } from "./teams.ts";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Int = Type.Integer({ description: "A level number" });
const Ids = (description: string) => Type.Array(Id, { description });

const TeamSpec = Type.Union(
	[
		Type.Object({ kind: Type.Literal("solo", { description: "Alone" }) }, { description: "Everyone plays alone." }),
		Type.Object({ kind: Type.Literal("random", { description: "Seeded" }), size: Type.Integer({ minimum: 1, description: "Residents per team." }) }, { description: "Seeded teams of one size." }),
		Type.Object({ kind: Type.Literal("sameAs", { description: "Reused" }), level: Type.Integer({ minimum: 1, description: "The level whose teams are reused." }) }, { description: "The teams of another level." }),
		Type.Object(
			{ kind: Type.Literal("splitFrom", { description: "Mixed" }), level: Type.Integer({ minimum: 1, description: "The level whose teams are mixed." }), size: Type.Integer({ minimum: 1, description: "Residents per new team." }) },
			{ description: "New teams drawn from as many old teams as possible." },
		),
	],
	{ description: "How the residents form teams on the level." },
);

const PuzzleSpec = Type.Object(
	{
		kind: Type.Literal("fragments", { description: "The only kind of puzzle so far" }),
		length: Type.Tuple([Type.Integer({ description: "Shortest" }), Type.Integer({ description: "Longest" })], { description: "Inclusive password length range." }),
		overlap: Type.Integer({ minimum: 0, description: "Characters shared at each seam." }),
		ownChars: Type.Optional(Type.Integer({ minimum: 1, description: "Characters each fragment holds that no other has." })),
	},
	{ description: "A password cut into overlapping fragments, one per team member." },
);

const LevelSpec = Type.Object({ number: Type.Integer({ minimum: 1, description: "The level's number." }), team: TeamSpec, puzzle: PuzzleSpec }, { description: "One level." });

const Standing = Type.Object(
	{ level: Type.Integer({ minimum: 1, description: "The level the resident stands on." }), passed: Type.Optional(Type.Array(Int, { description: "The levels it has passed; none when left out." })) },
	{ description: "Where one resident stands." },
);

/**
 * The options of the mechanic.
 *
 * @public
 */
export const PuzzlesOptions = Type.Object({
	levels: Type.Array(LevelSpec, { default: [], description: "The game's levels with their team layout and puzzle." }),
	startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident starts on; the first level that is dealt." }),
	lastLevel: Type.Integer({ minimum: 0, default: 0, description: "The highest level that is dealt; 0 means the game's last level." }),
	standings: Type.Optional(
		Type.Record(Type.String(), Standing, { description: "Where each resident stands, by resident id (a stand-in of milestone M3 until a mechanic tracks progress). A resident left out, or the option left out, stands on `startLevel` with nothing passed." }),
	),
});

/**
 * The events of the mechanic, in the old field order.
 *
 * @public
 */
export const PuzzlesEvents = defineEvents("puzzles", {
	fragments_dealt: Type.Object(
		{ level: Int, holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer({ description: "The index of its team" }), fragment: Type.String({ description: "Its fragment of the team's password" }) }, { description: "One resident's fragment" }), { description: "Every fragment, by team and then by resident id" }) },
		{ description: "A level was dealt: its teams and the fragment each resident holds" },
	),
	factor_burned: Type.Object(
		{ agent: Id, level: Int, piece: Type.String({ description: "The id of the piece, for example `L4-fragment`" }), needers: Ids("The residents who still need it, in team order") },
		{ description: "A piece is gone with its banished holder" },
	),
	level_contracted: Type.Object({ level: Int, excluded: Ids("Every banished resident, in the game's order") }, { description: "On a level nobody left has reached, the banished are out of their teams" }),
});

/**
 * The puzzle of one level: a password per team.
 *
 * @public
 */
export interface LevelPuzzle {
	/** The kind of puzzle. */
	readonly kind: "fragments";
	/** The puzzle of each team, in team order. */
	readonly puzzles: readonly FragmentPuzzle[];
	/** Resident id to its fragment. */
	readonly fragments: ReadonlyMap<string, string>;
}

/**
 * One dealt level.
 *
 * @public
 */
export interface LevelState {
	/** Its teams. */
	readonly teams: readonly Team[];
	/** Its puzzle. */
	readonly puzzle: LevelPuzzle;
}

/**
 * The state of the mechanic.
 *
 * @public
 */
export interface PuzzlesState {
	/** The dealt levels, by number. */
	readonly levels: Map<number, LevelState>;
	/** Per level, the banished whose places pass on. */
	readonly exclusions: Map<number, Set<string>>;
	/** The planner of the teams; not saved, it is drawn from the seed. */
	readonly planner: TeamPlanner;
}

const LevelSnapshot = Type.Object(
	{
		level: Int,
		teams: Type.Array(Type.Object({ members: Ids("The members, in the order drawn"), leader: Id }, { description: "One team" }), { description: "The teams" }),
		kind: Type.Literal("fragments", { description: "The kind of puzzle" }),
		puzzles: Type.Array(
			Type.Object({ password: Type.String({ description: "The password" }), fragments: Type.Array(Type.String({ description: "A fragment" }), { description: "Its fragments, in password order" }), overlap: Type.Integer({ description: "Characters shared at each seam" }) }, { description: "One team's puzzle" }),
			{ description: "The puzzle of each team" },
		),
		fragments: Type.Array(Type.Object({ agent: Id, fragment: Type.String({ description: "Its fragment" }) }, { description: "One holding" }), { description: "Who holds which fragment" }),
	},
	{ description: "One dealt level" },
);

/** The saved state: the dealt levels and the exclusions (the old slice without the city factors). */
export const PuzzlesSlice = Type.Object(
	{ levels: Type.Array(LevelSnapshot, { description: "The dealt levels, ascending" }), exclusions: Type.Array(Type.Object({ level: Int, agents: Ids("The banished") }, { description: "One level's exclusions" }), { description: "The exclusions per level" }) },
	{ description: "The saved state of the puzzles" },
);

/**
 * Saves the state.
 *
 * @param state - The state.
 * @returns The slice.
 */
export function saveLevels(state: PuzzlesState): Static<typeof PuzzlesSlice> {
	const levels = [...state.levels]
		.sort(([a], [b]) => a - b)
		.map(([level, { teams, puzzle }]) => ({
			level,
			teams: teams.map((team) => ({ members: [...team.members], leader: team.leader })),
			kind: puzzle.kind,
			puzzles: puzzle.puzzles.map((item) => ({ password: item.password, fragments: [...item.fragments], overlap: item.overlap })),
			fragments: [...puzzle.fragments].map(([agent, fragment]) => ({ agent, fragment })),
		}));
	return { levels, exclusions: [...state.exclusions].map(([level, set]) => ({ level, agents: [...set] })) };
}

/**
 * Builds the state from a slice.
 *
 * @param data - The slice.
 * @param planner - A fresh planner.
 * @returns The state.
 */
export function loadLevels(data: Static<typeof PuzzlesSlice>, planner: TeamPlanner): PuzzlesState {
	const levels = new Map<number, LevelState>(
		data.levels.map((entry) => [entry.level, { teams: entry.teams, puzzle: { kind: "fragments", puzzles: entry.puzzles, fragments: new Map(entry.fragments.map((held) => [held.agent, held.fragment])) } }]),
	);
	return { levels, exclusions: new Map(data.exclusions.map((entry) => [entry.level, new Set(entry.agents)])), planner };
}

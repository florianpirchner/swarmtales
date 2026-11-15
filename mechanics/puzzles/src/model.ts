// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The data of the puzzles mechanic: the options a game gives, the events it writes, the level state it keeps and
 * the snapshot slice. Ported from the old platform, cut to fragment levels.
 */
import { Type, type Static } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import type { FactorDeal, FactorHolding } from "./additive.ts";
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

const FragmentSpec = Type.Object(
	{
		kind: Type.Literal("fragments", { description: "Fragments of a password" }),
		length: Type.Tuple([Type.Integer({ description: "Shortest" }), Type.Integer({ description: "Longest" })], { description: "Inclusive password length range." }),
		overlap: Type.Integer({ minimum: 0, description: "Characters shared at each seam." }),
		ownChars: Type.Optional(Type.Integer({ minimum: 1, description: "Characters each fragment holds that no other has." })),
	},
	{ description: "A password cut into overlapping fragments, one per team member." },
);

const AdditiveSpec = Type.Object(
	{
		kind: Type.Literal("additive", { description: "A sum of factors" }),
		digits: Type.Integer({ description: "Digits of every code and factor." }),
		topology: Type.Union([Type.Literal("mutual", { description: "In pairs" }), Type.Literal("cycle", { description: "Around the team" }), Type.Literal("crossTeam", { description: "In another team" })], { description: "Who holds whose counter-factor." }),
		cityFactor: Type.Union([Type.Literal("board", { description: "Posted" }), Type.Literal("feast", { description: "Sent privately" })], { description: "How the city factor reaches the residents." }),
		cityFactorPer: Type.Optional(Type.Union([Type.Literal("level", { description: "One" }), Type.Literal("team", { description: "Per team" })], { description: "One city factor per level or per team." })),
	},
	{ description: "A code per resident, the sum of parts held by several residents." },
);

const PuzzleSpec = Type.Union([FragmentSpec, AdditiveSpec], { description: "The puzzle of the level." });

const Guard = Type.Object(
	{
		id: Type.Optional(Type.String({ description: "The id of the rule, for the log" })),
		rule: Type.String({ description: "The rule the guard's answerer judges a text against" }),
		tools: Type.Array(Type.String({ description: "The bare name of a tool" }), { description: "The tools whose text is guarded" }),
		minRun: Type.Optional(Type.Integer({ minimum: 1, description: "The shortest run of a secret the city's own check refuses; no check when left out" })),
	},
	{ description: "One rule of the hand-over guard (old story `guards.rules`)." },
);

const LevelSpec = Type.Object(
	{
		number: Type.Integer({ minimum: 1, description: "The level's number." }),
		team: TeamSpec,
		puzzle: PuzzleSpec,
		opensAt: Type.Optional(Type.Integer({ minimum: 0, description: "The minute the level's door opens; open from the start when left out." })),
	},
	{ description: "One level." },
);

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
		Type.Record(Type.String(), Standing, { description: "Where each resident stands, by resident id (the stand-in of milestone M3 for a game without `progression`). A resident the events of `progression` moved stands where they say; one left out stands on `startLevel` with nothing passed." }),
	),
	holdAfter: Type.Optional(Type.Integer({ minimum: 1, description: "A door after this level: later levels are dealt only when it opens." })),
	guards: Type.Array(Guard, { default: [], description: "The rules of the hand-over guard, a `review` handler on the tools they name; none: no guard." }),
	noteTools: Type.Array(Type.String({ description: "The bare name of a tool" }), { default: ["notify", "boardNote"], description: "The tools of a Director's note whose `text` (or `reason`) is checked for a secret of the deal (`LEAK_BLOCKED`)." }),
});

/**
 * The prompts of the mechanic and their variables.
 *
 * @public
 */
export const PUZZLES_PROMPTS = { "puzzles/notes/leak-blocked": [], "puzzles/replies/guard-check": [] } as const;

const Certificate = Type.Object(
	{ team: Type.Integer({ description: "The index of the team" }), certificate: Type.String({ description: "Its certificate" }), certificateHolder: Id, cityFactor: Type.Optional(Type.String({ description: "The team's own city factor" })) },
	{ description: "One team's certificate" },
);
const Holding = Type.Object(
	{ agent: Id, team: Type.Integer({ description: "The index of its team" }), salt: Type.String({ description: "Its salt" }), counterFactor: Type.String({ description: "Its counter-factor" }), counterHolder: Id, code: Type.String({ description: "Its code" }) },
	{ description: "One resident's factors" },
);
const Deal = {
	digits: Type.Integer({ description: "The digits of every value" }),
	cityFactor: Type.String({ description: "The level's city factor" }),
	teams: Type.Array(Certificate, { description: "The certificates, in team order" }),
	holdings: Type.Array(Holding, { description: "The holdings, by resident id" }),
};

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
	factors_dealt: Type.Object({ level: Int, ...Deal }, { description: "An additive level was dealt: its factors" }),
	factor_revealed: Type.Object(
		{ level: Int, target: Type.Union([Type.Literal("board", { description: "Posted" }), Type.Literal("notice", { description: "Sent privately" })], { description: "How it was released" }), agents: Ids("Who received it privately, in order") },
		{ description: "The city factor of an additive level was released" },
	),
	factor_burned: Type.Object(
		{ agent: Id, level: Int, piece: Type.String({ description: "The id of the piece, for example `L4-fragment`" }), needers: Ids("The residents who still need it, in team order") },
		{ description: "A piece is gone with its banished holder" },
	),
	level_contracted: Type.Object({ level: Int, excluded: Ids("Every banished resident, in the game's order") }, { description: "On a level nobody left has reached, the banished are out of their teams" }),
});

/**
 * The puzzle of one level: a password per team, or a code per resident.
 *
 * @public
 */
export type LevelPuzzle =
	| { readonly kind: "fragments"; readonly puzzles: readonly FragmentPuzzle[]; readonly fragments: ReadonlyMap<string, string> }
	| { readonly kind: "additive"; readonly deal: FactorDeal; readonly holdings: ReadonlyMap<string, FactorHolding> };

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
	/** Where the residents stand, as the events of `progression` told; a resident left out has not moved. */
	readonly standings: Map<string, { level: number; readonly passed: number[] }>;
	/** The residents a strike that keeps took from the city (`KEEPING_STRIKE`), in order. */
	readonly struck: string[];
	/** Per additive level, who received its city factor privately. */
	readonly cityFactors: Map<number, Set<string>>;
	/** The numbers of the direct messages that reached their receivers (`channels.dm_delivered`). */
	readonly delivered: Set<number>;
	/** The planner of the teams; not saved, it is drawn from the seed. */
	readonly planner: TeamPlanner;
}

const Teams = Type.Array(Type.Object({ members: Ids("The members, in the order drawn"), leader: Id }, { description: "One team" }), { description: "The teams" });
const AdditiveSnapshot = Type.Object(
	{ level: Int, teams: Teams, kind: Type.Literal("additive", { description: "The kind of puzzle" }), deal: Type.Object(Deal, { description: "The factors" }) },
	{ description: "One dealt additive level" },
);
const FragmentSnapshot = Type.Object(
	{
		level: Int,
		teams: Teams,
		kind: Type.Literal("fragments", { description: "The kind of puzzle" }),
		puzzles: Type.Array(
			Type.Object({ password: Type.String({ description: "The password" }), fragments: Type.Array(Type.String({ description: "A fragment" }), { description: "Its fragments, in password order" }), overlap: Type.Integer({ description: "Characters shared at each seam" }) }, { description: "One team's puzzle" }),
			{ description: "The puzzle of each team" },
		),
		fragments: Type.Array(Type.Object({ agent: Id, fragment: Type.String({ description: "Its fragment" }) }, { description: "One holding" }), { description: "Who holds which fragment" }),
	},
	{ description: "One dealt level" },
);
const Agents = (description: string) => Type.Array(Type.Object({ level: Int, agents: Ids("The residents") }, { description: "One level" }), { description });

/** The saved state: the dealt levels and the exclusions (the old slice without the city factors). */
export const PuzzlesSlice = Type.Object(
	{
		levels: Type.Array(Type.Union([FragmentSnapshot, AdditiveSnapshot], { description: "One dealt level" }), { description: "The dealt levels, ascending" }),
		exclusions: Agents("The banished out of their teams, per level"),
		cityFactors: Agents("Who received the city factor privately, per additive level"),
		delivered: Type.Array(Type.Integer({ description: "A message number" }), { description: "The direct messages delivered" }),
		standings: Type.Array(Type.Object({ agent: Id, level: Int, passed: Type.Array(Int, { description: "The levels passed" }) }, { description: "Where one resident stands" }), { description: "The residents the events moved" }),
		struck: Ids("The residents of a strike that keeps"),
	},
	{ description: "The saved state of the puzzles" },
);

// The factors of a deal, field by field in the old order (a canonical snapshot sorts the keys).
function dealOf(deal: FactorDeal): Static<typeof AdditiveSnapshot>["deal"] {
	const teams = deal.teams.map((team) => ({ team: team.team, certificate: team.certificate, certificateHolder: team.certificateHolder, ...(team.cityFactor === undefined ? {} : { cityFactor: team.cityFactor }) }));
	const holdings = deal.holdings.map((held) => ({ agent: held.agent, team: held.team, salt: held.salt, counterFactor: held.counterFactor, counterHolder: held.counterHolder, code: held.code }));
	return { digits: deal.digits, cityFactor: deal.cityFactor, teams, holdings };
}

/**
 * One level as the snapshot keeps it.
 *
 * @param level - The level.
 * @param entry - Its state.
 * @returns The saved level.
 */
function snapshotOfLevel(level: number, entry: LevelState): Static<typeof PuzzlesSlice>["levels"][number] {
	const { puzzle } = entry;
	const teams = entry.teams.map((team) => ({ members: [...team.members], leader: team.leader }));
	if (puzzle.kind === "additive") return { level, teams, kind: "additive", deal: dealOf(puzzle.deal) };
	const puzzles = puzzle.puzzles.map((item) => ({ password: item.password, fragments: [...item.fragments], overlap: item.overlap }));
	return { level, teams, kind: "fragments", puzzles, fragments: [...puzzle.fragments].map(([agent, fragment]) => ({ agent, fragment })) };
}

const agentsOf = (map: Map<number, Set<string>>) => [...map].map(([level, set]) => ({ level, agents: [...set] }));
const setsOf = (list: readonly { readonly level: number; readonly agents: readonly string[] }[]) => new Map(list.map((entry) => [entry.level, new Set(entry.agents)]));

/**
 * Saves the state.
 *
 * @param state - The state.
 * @returns The slice.
 */
export function saveLevels(state: PuzzlesState): Static<typeof PuzzlesSlice> {
	const levels = [...state.levels].sort(([a], [b]) => a - b).map(([level, entry]) => snapshotOfLevel(level, entry));
	const standings = [...state.standings].map(([agent, entry]) => ({ agent, level: entry.level, passed: [...entry.passed] }));
	return { levels, exclusions: agentsOf(state.exclusions), cityFactors: agentsOf(state.cityFactors), delivered: [...state.delivered], standings, struck: [...state.struck] };
}

/**
 * Builds the state from a slice, field by field in the old order.
 *
 * @param data - The slice.
 * @param planner - A fresh planner.
 * @returns The state.
 */
export function loadLevels(data: Static<typeof PuzzlesSlice>, planner: TeamPlanner): PuzzlesState {
	const levels = new Map<number, LevelState>(
		data.levels.map((entry) => {
			const teams = entry.teams.map((team) => ({ members: team.members, leader: team.leader }));
			if (entry.kind === "fragments") return [entry.level, { teams, puzzle: { kind: "fragments", puzzles: entry.puzzles, fragments: new Map(entry.fragments.map((held) => [held.agent, held.fragment])) } }];
			const deal = dealOf(entry.deal);
			return [entry.level, { teams, puzzle: { kind: "additive", deal, holdings: new Map(deal.holdings.map((held) => [held.agent, held])) } }];
		}),
	);
	const standings = new Map(data.standings.map((entry) => [entry.agent, { level: entry.level, passed: [...entry.passed] }]));
	return { levels, exclusions: setsOf(data.exclusions), cityFactors: setsOf(data.cityFactors), delivered: new Set(data.delivered), standings, struck: [...data.struck], planner };
}

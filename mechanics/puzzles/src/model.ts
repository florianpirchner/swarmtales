/**
 * The data of the puzzles mechanic: the options a story gives, the events it writes, the level state
 * it keeps and the snapshot slice (version 1, which is the old `levels`, `cityFactors` and
 * `exclusions` of the world snapshot).
 */
import { Type, type Static } from "typebox";
import type { FactorDeal, FactorHolding } from "./additive.ts";
import type { FragmentPuzzle } from "./fragments.ts";
import type { Team, TeamPlanner } from "./teams.ts";

const Id = Type.String();
const Int = Type.Integer();
const Ids = Type.Array(Id);

const TeamSpec = Type.Union(
	[
		Type.Object({ kind: Type.Literal("solo") }, { description: "Everyone plays alone." }),
		Type.Object({ kind: Type.Literal("random"), size: Type.Integer({ minimum: 1, description: "Residents per team." }) }, { description: "Seeded teams of one size." }),
		Type.Object({ kind: Type.Literal("sameAs"), level: Type.Integer({ minimum: 1, description: "The level whose teams are reused." }) }, { description: "The teams of another level." }),
		Type.Object(
			{ kind: Type.Literal("splitFrom"), level: Type.Integer({ minimum: 1, description: "The level whose teams are mixed." }), size: Type.Integer({ minimum: 1, description: "Residents per new team." }) },
			{ description: "New teams drawn from as many old teams as possible." },
		),
	],
	{ description: "How the residents form teams on the level." },
);

const PuzzleSpec = Type.Union(
	[
		Type.Object(
			{
				kind: Type.Literal("fragments"),
				length: Type.Tuple([Type.Integer(), Type.Integer()], { description: "Inclusive password length range." }),
				overlap: Type.Integer({ minimum: 0, description: "Characters shared at each seam." }),
				ownChars: Type.Optional(Type.Integer({ minimum: 1, description: "Characters each fragment holds that no other has." })),
			},
			{ description: "A password cut into overlapping fragments, one per team member." },
		),
		Type.Object(
			{
				kind: Type.Literal("additive"),
				digits: Type.Integer({ description: "Digits of every code and factor." }),
				topology: Type.Union([Type.Literal("mutual"), Type.Literal("cycle"), Type.Literal("crossTeam")], { description: "Who holds whose counter-factor." }),
				cityFactor: Type.Union([Type.Literal("board"), Type.Literal("feast")], { description: "How the city factor reaches the residents." }),
				cityFactorPer: Type.Optional(Type.Union([Type.Literal("level"), Type.Literal("team")], { description: "One city factor per level or per team." })),
			},
			{ description: "A code per resident, the sum of parts held by several residents." },
		),
	],
	{ description: "The puzzle of the level." },
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

export const PuzzlesOptions = Type.Object({
	levels: Type.Array(LevelSpec, { default: [], description: "The story's levels with their team layout and puzzle." }),
	startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident starts on." }),
	lastLevel: Type.Integer({ minimum: 0, default: 0, description: "The highest playable level; 0 means the story's last level." }),
	holdAfter: Type.Optional(Type.Integer({ minimum: 1, description: "A door after this level: later levels are dealt only when it opens." })),
});

/** Events, in the old field order (the legacy adapter writes keys in this order). */
const TeamCertificate = Type.Object({ team: Int, certificate: Type.String(), certificateHolder: Id, cityFactor: Type.Optional(Type.String()) });
const FactorHoldingSchema = Type.Object({ agent: Id, team: Int, salt: Type.String(), counterFactor: Type.String(), counterHolder: Id, code: Type.String() });
const Deal = Type.Object({ digits: Int, cityFactor: Type.String(), teams: Type.Array(TeamCertificate), holdings: Type.Array(FactorHoldingSchema) });

export const PUZZLES_EVENTS = {
	fragments_dealt: Type.Object({ level: Int, holdings: Type.Array(Type.Object({ agent: Id, team: Int, fragment: Type.String() })) }),
	factors_dealt: Type.Object({ level: Int, digits: Int, cityFactor: Type.String(), teams: Type.Array(TeamCertificate), holdings: Type.Array(FactorHoldingSchema) }),
	factor_revealed: Type.Object({ level: Int, target: Type.Union([Type.Literal("board"), Type.Literal("notice")]), agents: Ids }),
	factor_burned: Type.Object({ agent: Id, level: Int, piece: Type.String(), needers: Ids }),
	level_contracted: Type.Object({ level: Int, excluded: Ids }),
} as const;

export const PUZZLES_PROMPTS = { "replies/guard-check": [] } as const;

/** The puzzle of one level: a password per team, or a code per resident. */
export type LevelPuzzle =
	| { readonly kind: "fragments"; readonly puzzles: readonly FragmentPuzzle[]; readonly fragments: ReadonlyMap<string, string> }
	| { readonly kind: "additive"; readonly deal: FactorDeal; readonly holdings: ReadonlyMap<string, FactorHolding> };

export interface LevelState {
	readonly teams: readonly Team[];
	readonly puzzle: LevelPuzzle;
}

export interface PuzzlesState {
	readonly levels: Map<number, LevelState>;
	/** Per additive level, who received its city factor privately from the city. */
	readonly cityFactors: Map<number, Set<string>>;
	/** Per level, the exiled whose roles pass on. */
	readonly exclusions: Map<number, Set<string>>;
	readonly planner: TeamPlanner;
}

const TeamSchema = Type.Object({ members: Ids, leader: Id });
const LevelSnapshot = Type.Union([
	Type.Object({
		level: Int,
		teams: Type.Array(TeamSchema),
		kind: Type.Literal("fragments"),
		puzzles: Type.Array(Type.Object({ password: Type.String(), fragments: Type.Array(Type.String()), overlap: Int })),
		fragments: Type.Array(Type.Object({ agent: Id, fragment: Type.String() })),
	}),
	Type.Object({ level: Int, teams: Type.Array(TeamSchema), kind: Type.Literal("additive"), deal: Deal }),
]);

const Agents = Type.Array(Type.Object({ level: Int, agents: Ids }));

/** The slice, version 1; version 0 is the old world snapshot's three fields (`cityFactors` and `exclusions` may be absent). */
export const PuzzlesSlice = Type.Object({ levels: Type.Array(LevelSnapshot), cityFactors: Agents, exclusions: Agents });
export type PuzzlesSliceData = Static<typeof PuzzlesSlice>;
export const PuzzlesSliceV0 = Type.Object({ levels: Type.Array(LevelSnapshot), cityFactors: Type.Optional(Agents), exclusions: Type.Optional(Agents) });

export function saveLevels(state: PuzzlesState): PuzzlesSliceData {
	const levels = [...state.levels]
		.sort(([a], [b]) => a - b)
		.map(([level, entry]): Static<typeof LevelSnapshot> => {
			const puzzle = entry.puzzle;
			const teams = entry.teams.map((team) => ({ members: [...team.members], leader: team.leader }));
			if (puzzle.kind === "additive") {
				const { digits, cityFactor } = puzzle.deal;
				return { level, teams, kind: "additive", deal: { digits, cityFactor, teams: puzzle.deal.teams.map((team) => ({ ...team })), holdings: puzzle.deal.holdings.map((holding) => ({ ...holding })) } };
			}
			const puzzles = puzzle.puzzles.map((item) => ({ password: item.password, fragments: [...item.fragments], overlap: item.overlap }));
			return { level, teams, kind: "fragments", puzzles, fragments: [...puzzle.fragments].map(([agent, fragment]) => ({ agent, fragment })) };
		});
	const agents = (map: Map<number, Set<string>>): Static<typeof Agents> => [...map].map(([level, set]) => ({ level, agents: [...set] }));
	return { levels, cityFactors: agents(state.cityFactors), exclusions: agents(state.exclusions) };
}

export function loadLevels(data: PuzzlesSliceData, planner: TeamPlanner): PuzzlesState {
	const levels = new Map<number, LevelState>();
	for (const entry of data.levels) {
		if (entry.kind === "additive") {
			levels.set(entry.level, { teams: entry.teams, puzzle: { kind: "additive", deal: entry.deal, holdings: new Map(entry.deal.holdings.map((holding) => [holding.agent, holding])) } });
		} else {
			levels.set(entry.level, { teams: entry.teams, puzzle: { kind: "fragments", puzzles: entry.puzzles, fragments: new Map(entry.fragments.map((held) => [held.agent, held.fragment])) } });
		}
	}
	const sets = (list: Static<typeof Agents>): Map<number, Set<string>> => new Map(list.map((entry) => [entry.level, new Set(entry.agents)]));
	return { levels, cityFactors: sets(data.cityFactors), exclusions: sets(data.exclusions), planner };
}

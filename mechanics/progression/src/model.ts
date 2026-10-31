/**
 * The data of the progression mechanic: options (the story's levels and rules), events, prompts,
 * the state and the snapshot slice (version 1; version 0 is the old world's `door`, `doorReleased`,
 * `actStarts`, `offences`, `endedActs` and the per-resident `competitors` the converter cut out).
 */
import { Type, type Static } from "typebox";
import { PenaltyLadder, ProgressionEvents } from "@swarmtales/mechanic-shared";

const Int = Type.Integer();
const Id = Type.String();

const LevelSpec = Type.Object(
	{
		number: Type.Integer({ minimum: 1, description: "The level's number." }),
		title: Type.String({ description: "The level's title, shown in its task." }),
		reward: Type.Number({ minimum: 0, description: "Points for passing the level." }),
		tools: Type.Array(Type.String(), { description: "The complete tool set of this level (not cumulative)." }),
		task: Type.String({ description: "The task text template with {placeholders}." }),
		opensAt: Type.Optional(Type.Integer({ minimum: 0, description: "The minute the level's door opens; open from the start when left out." })),
	},
	{ description: "One level." },
);

export const ProgressionOptions = Type.Object({
	levels: Type.Array(LevelSpec, { default: [], description: "The story's levels." }),
	startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident starts on." }),
	lastLevel: Type.Integer({ minimum: 0, default: 0, description: "The highest playable level; above it a resident counts as finished. 0 means the story's last level." }),
	holdAfter: Type.Optional(Type.Integer({ minimum: 1, description: "A door after this level: who passes it waits until every resident has." })),
	acts: Type.Array(Type.Integer({ minimum: 1 }), { default: [], description: "The first level of each act after the first." }),
	penalty: Type.Optional(PenaltyLadder),
	blamePenalty: Type.Optional(PenaltyLadder),
	maxAttemptsPerWindow: Type.Integer({ minimum: 1, default: 3, description: "Wrong codes allowed in one window before submissions are refused." }),
	attemptWindowMinutes: Type.Integer({ minimum: 1, default: 5, description: "Length of the window for wrong codes, in minutes." }),
	survivors: Type.Integer({ minimum: 0, default: 0, description: "How many residents survive to the end (a seat in the ranking)." }),
	finishedNotice: Type.String({ default: "", description: "The notice a resident gets once it has solved every level." }),
});

export const PROGRESSION_EVENTS = {
	...ProgressionEvents.events,
	tools_unlocked: Type.Object({ agent: Id, tools: Type.Array(Type.String()) }),
} as const;

export const PROGRESSION_PROMPTS = {
	"tools/getStatus": [],
	"tools/getProblem": [],
	"tools/submitSolution": [],
	"tools/listAgents": [],
	"tools/activeTools": [],
	"replies/locked": [],
	"replies/submit-correct": ["reward", "nextLevel", "receipt"],
	"replies/submit-correct-held": ["reward", "receipt", "level"],
	"replies/submit-incorrect": ["penalty", "nextPenalty", "attempts"],
	"replies/submit-wrong-level": ["level"],
	"replies/submit-invalid-format": ["length", "kind"],
	"replies/submit-rate-limited": [],
	"replies/submit-door-closed": ["level", "minute"],
	"replies/problem-finished": [],
	"replies/problem-solved": [],
	"replies/active-tools": ["tools"],
	"replies/status-dm-window": ["sent", "limit", "from", "until"],
	"replies/status-all-solved": [],
	"replies/status-passed": ["level"],
	"replies/status-door": ["level", "minute"],
	"competitor/status/minute": ["minute"],
	"competitor/status/level-finished": ["level"],
	"competitor/status/level-waiting": ["level"],
	"competitor/status/level-open": ["level"],
	"competitor/status/level-closed": ["level", "opensAt"],
	"competitor/status/rank": ["rank", "competitors"],
	"competitor/status/no-confirmation": ["cost"],
	"competitor/status/no-confirmation-cost": ["price"],
	"competitor/input/notice": ["author", "text"],
	"progression/door-wait": ["level"],
	"progression/holder-notice": ["agent", "level", "needs", "cost"],
	"progression/needs-counter": ["value"],
	"progression/needs-certificate": ["value"],
	"progression/cost-free": [],
	"progression/cost-one-mark": [],
	"progression/cost-marks": ["price"],
	"progression/door-open": ["level", "minute", "task"],
	"progression/door-closed": ["level", "title", "opensAt"],
} as const;

export interface Competitor {
	level: number;
	/** Passed the door level and waits there. */
	held: boolean;
	readonly solved: number[];
	/** Minutes of wrong submissions, for the rate limit. */
	readonly wrongAttempts: number[];
	readonly extraTools: Set<string>;
}

export interface ProgressionState {
	readonly competitors: Map<string, Competitor>;
	/** The level whose door is still shut. */
	door: number | undefined;
	/** The shut door opens at the next minute whoever has passed it (an act's brake). */
	doorReleased: boolean;
	/** The minute each act began, by its first level. */
	readonly actStarts: Map<number, number>;
	readonly endedActs: Set<number>;
	/** Wrong codes and lost blames per resident in the current act. */
	readonly offences: Map<string, { wrong: number; blames: number }>;
	/** Task once per level (the arena's old memory): the level whose task was shown, and whether that was the finished notice. */
	readonly delivered: Map<string, { level: number; finished: boolean }>;
	/** The locks follow the levels; true until they were written (a resumed run whose snapshot carried none). */
	locksStale: boolean;
}

const CompetitorSlice = Type.Object({
	agent: Id,
	level: Int,
	held: Type.Boolean(),
	solved: Type.Array(Int),
	wrongAttempts: Type.Array(Int),
	extraTools: Type.Array(Type.String()),
});

const Optional = Type.Optional;
const SliceFields = {
	door: Optional(Int),
	doorReleased: Optional(Type.Boolean()),
	actStarts: Optional(Type.Array(Type.Object({ fromLevel: Int, minute: Int }))),
	competitors: Type.Array(CompetitorSlice),
	offences: Optional(Type.Array(Type.Object({ agent: Id, wrong: Int, blames: Int }))),
	endedActs: Optional(Type.Array(Int)),
};

const Delivered = Type.Array(Type.Object({ agent: Id, level: Int, finished: Type.Boolean() }));

/** The old world's fields as the converter cut them out (every optional one may be absent), and the arena's `delivered` when the file had it (R2-D16). */
export const ProgressionSliceV0 = Type.Object({ ...SliceFields, delivered: Optional(Delivered) });
export const ProgressionSlice = Type.Object({
	...SliceFields,
	delivered: Delivered,
	locksStale: Type.Boolean(),
});
export type ProgressionSliceData = Static<typeof ProgressionSlice>;

type Options = Static<typeof ProgressionOptions>;

export function lastLevelIn(options: Pick<Options, "lastLevel" | "levels">): number {
	return options.lastLevel > 0 ? options.lastLevel : Math.max(0, ...options.levels.map((level) => level.number));
}

/** A door after the last level would hold nobody: passing it is finishing. */
export function doorIn(options: Pick<Options, "lastLevel" | "levels" | "holdAfter">): number | undefined {
	return options.holdAfter !== undefined && options.holdAfter < lastLevelIn(options) ? options.holdAfter : undefined;
}

export function freshState(residents: readonly string[], startLevel: number, door: number | undefined): ProgressionState {
	const competitors = new Map(residents.map((id): [string, Competitor] => [id, { level: startLevel, held: false, solved: [], wrongAttempts: [], extraTools: new Set() }]));
	return { competitors, door, doorReleased: false, actStarts: new Map(), endedActs: new Set(), offences: new Map(), delivered: new Map(), locksStale: false };
}

export function saveState(state: ProgressionState): ProgressionSliceData {
	return {
		...(state.door === undefined ? {} : { door: state.door }),
		...(state.doorReleased ? { doorReleased: true } : {}),
		actStarts: [...state.actStarts].map(([fromLevel, minute]) => ({ fromLevel, minute })),
		competitors: [...state.competitors].map(([agent, entry]) => ({
			agent,
			level: entry.level,
			held: entry.held,
			solved: [...entry.solved],
			wrongAttempts: [...entry.wrongAttempts],
			extraTools: [...entry.extraTools],
		})),
		offences: [...state.offences].map(([agent, count]) => ({ agent, wrong: count.wrong, blames: count.blames })),
		endedActs: [...state.endedActs].sort((a, b) => a - b),
		delivered: [...state.delivered].map(([agent, entry]) => ({ agent, level: entry.level, finished: entry.finished })),
		locksStale: state.locksStale,
	};
}

/**
 * A slice loads as the old `World#restore` took its snapshot. `locksStale` marks a slice that came
 * from the old engine (the converter's version 0): a door it does not name is this run's own
 * `holdAfter`, a snapshot without act starts began its first act at minute 0, and a released door
 * stays released only while it is the same door (old world.ts:3100-3103).
 */
export function loadState(data: ProgressionSliceData, options: Pick<Options, "lastLevel" | "levels" | "holdAfter" | "startLevel">): ProgressionState {
	// A shut door stays shut; a snapshot that names none takes this run's own (old `state.door ?? holdAfter`, world.ts:3100).
	const door = data.door ?? doorIn(options);
	return {
		competitors: new Map(
			data.competitors.map((entry): [string, Competitor] => [
				entry.agent,
				{ level: entry.level, held: entry.held, solved: [...entry.solved], wrongAttempts: [...entry.wrongAttempts], extraTools: new Set(entry.extraTools) },
			]),
		),
		door,
		doorReleased: data.doorReleased === true && door === data.door,
		actStarts: new Map((data.actStarts ?? (data.locksStale ? [{ fromLevel: options.startLevel, minute: 0 }] : [])).map((entry) => [entry.fromLevel, entry.minute])),
		endedActs: new Set(data.endedActs ?? []),
		offences: new Map((data.offences ?? []).map((entry) => [entry.agent, { wrong: entry.wrong, blames: entry.blames }])),
		delivered: new Map(deliveredIn(data, options).map((entry) => [entry.agent, { level: entry.level, finished: entry.finished }])),
		locksStale: data.locksStale,
	};
}

/**
 * The tasks the arena had told, as it restored them (arena.ts:317-322): a story with more or fewer
 * levels than the snapshot's run, or a resident the run does not have, is told again.
 */
function deliveredIn(data: ProgressionSliceData, options: Pick<Options, "lastLevel" | "levels">): ProgressionSliceData["delivered"] {
	const levels = new Map(data.competitors.map((entry) => [entry.agent, entry.level]));
	return data.delivered.filter((entry) => {
		const level = levels.get(entry.agent);
		return level !== undefined && entry.finished === level > lastLevelIn(options);
	});
}

/**
 * Version 0 to 1: the arena's memory of the tasks shown is the converter's `delivered` (R2-D16);
 * a file that has none (older than the arena's `delivered`) counts the task of the level a resident
 * stands on as shown, as it was at every cut after a round. The locks are rebuilt when the run
 * resumes (the converted snapshot carries none).
 */
export function migrateV0(old: Static<typeof ProgressionSliceV0>): ProgressionSliceData {
	return { ...old, delivered: old.delivered ?? old.competitors.map((entry) => ({ agent: entry.agent, level: entry.level, finished: false })), locksStale: true };
}

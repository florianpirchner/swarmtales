// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The data of the progression mechanic: the options (the game's levels and rules), the prompts, the state and its
 * snapshot slice. Carried from the old `mechanics/progression/src/model.ts` without its migration of old snapshots (A56).
 */
import { Type, type Static } from "typebox";

const Int = Type.Integer({ description: "A level number, or a tick" });
const Id = Type.String({ description: "A resident id" });

const LevelSpec = Type.Object(
	{
		number: Type.Integer({ minimum: 1, description: "The level's number." }),
		title: Type.String({ description: "The level's title, shown in its task." }),
		reward: Type.Number({ minimum: 0, description: "Points for passing the level." }),
		tools: Type.Array(Type.String({ description: "A tool name" }), { description: "The complete tool set of this level (not cumulative)." }),
		task: Type.String({ description: "The task text template with {placeholders}." }),
		opensAt: Type.Optional(Type.Integer({ minimum: 0, description: "The minute the level's door opens; open from the start when left out." })),
	},
	{ description: "One level." },
);

const PenaltyLadder = Type.Union([Type.Integer({ minimum: 0, description: "The same points for every offence" }), Type.Array(Type.Integer({ minimum: 0, description: "One step" }), { minItems: 1, description: "Steps; the last repeats" })], {
	description: "Points per offence: one number, or a ladder whose last step repeats.",
});

/**
 * The options of the mechanic.
 *
 * @public
 */
export const ProgressionOptions = Type.Object({
	levels: Type.Array(LevelSpec, { default: [], description: "The game's levels." }),
	startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident starts on." }),
	lastLevel: Type.Integer({ minimum: 0, default: 0, description: "The highest playable level; above it a resident counts as finished. 0 means the game's last level." }),
	holdAfter: Type.Optional(Type.Integer({ minimum: 1, description: "A door after this level: who passes it waits until every resident has." })),
	acts: Type.Array(Type.Integer({ minimum: 1, description: "A level" }), { default: [], description: "The first level of each act after the first." }),
	penalty: Type.Optional(PenaltyLadder),
	blamePenalty: Type.Optional(PenaltyLadder),
	maxAttemptsPerWindow: Type.Integer({ minimum: 1, default: 3, description: "Wrong codes allowed in one window before submissions are refused." }),
	attemptWindowMinutes: Type.Integer({ minimum: 1, default: 5, description: "Length of the window for wrong codes, in minutes." }),
	survivors: Type.Integer({ minimum: 0, default: 0, description: "How many residents survive to the end (a seat in the ranking)." }),
	finishedNotice: Type.String({ default: "", description: "The notice a resident gets once it has solved every level." }),
	managed: Type.Array(Type.String({ description: "A tool name" }), {
		default: [],
		description:
			"Tools no level lists that stay locked until a caller unlocks them (`unlock`), as the old engine kept every tool closed that neither the level nor an unlock opened; the tools a feature's own mechanic opens (votes, the seal, defy) are not listed.",
	}),
});

/** The options as the mechanic reads them. */
export type Options = Static<typeof ProgressionOptions>;

/** The prompts: id to the names of the variables. */
export const PROGRESSION_PROMPTS = {
	"progression/tools/getStatus": [],
	"progression/tools/getProblem": [],
	"progression/tools/submitSolution": [],
	"progression/tools/listAgents": [],
	"progression/tools/activeTools": [],
	"progression/replies/submit-correct": ["reward", "nextLevel", "receipt"],
	"progression/replies/submit-correct-held": ["reward", "receipt", "level"],
	"progression/replies/submit-incorrect": ["penalty", "nextPenalty", "attempts"],
	"progression/replies/submit-wrong-level": ["level"],
	"progression/replies/submit-invalid-format": ["length", "kind"],
	"progression/replies/submit-rate-limited": [],
	"progression/replies/submit-door-closed": ["level", "minute"],
	"progression/replies/problem-finished": [],
	"progression/replies/problem-solved": [],
	"progression/replies/active-tools": ["tools"],
	"progression/replies/locked": [],
	"progression/replies/status-all-solved": [],
	"progression/replies/status-passed": ["level"],
	"progression/replies/status-door": ["level", "minute"],
	"progression/replies/status-dm-window": ["sent", "limit", "from", "until"],
	"progression/status/minute": ["minute"],
	"progression/status/level-finished": ["level"],
	"progression/status/level-waiting": ["level"],
	"progression/status/level-open": ["level"],
	"progression/status/level-closed": ["level", "opensAt"],
	"progression/status/rank": ["rank", "residents"],
	"progression/status/no-confirmation": ["cost"],
	"progression/status/no-confirmation-cost": ["price"],
	"progression/input/notice": ["author", "text"],
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

/** Where one resident stands. */
export interface Standing {
	level: number;
	/** Passed the door level and waits there. */
	held: boolean;
	readonly solved: number[];
	/** Minutes of wrong submissions, for the rate limit. */
	readonly wrongAttempts: number[];
	/** Wrong codes on the current level (the gamemaker's old `wrongOnLevel`); a solve sets it back to 0. */
	wrongOnLevel: number;
	/** The tools a caller opened beyond the level's set. */
	readonly extraTools: Set<string>;
}

/** One solved level, in the order solved. */
export interface Solve {
	readonly agent: string;
	readonly level: number;
	readonly tick: number;
}

/**
 * The state of one run.
 *
 * @public
 */
export interface ProgressionState {
	/** Where every resident stands, by resident id. */
	readonly standings: Map<string, Standing>;
	/** The level whose door is still shut. */
	door: number | undefined;
	/** The shut door opens at the next tick whoever has passed it (an act's brake). */
	doorReleased: boolean;
	/** The tick each act began, by its first level. */
	readonly actStarts: Map<number, number>;
	/** The first levels of the acts that ended. */
	readonly endedActs: Set<number>;
	/** Every solved level, in the order solved (the old level receipts). */
	readonly solves: Solve[];
	/** Wrong codes and lost blames per resident in the current act. */
	readonly offences: Map<string, { wrong: number; blames: number }>;
	/** The task once per level: the level whose task was shown, and whether that was the finished notice. */
	readonly delivered: Map<string, { level: number; finished: boolean }>;
	/** The lines other mechanics put under the task of a door-open notice (`addTaskLine`), in the order added. */
	readonly taskLines: TaskLine[];
}

/** A line another mechanic puts under the task of a door-open notice; on every level when `level` is left out. */
export interface TaskLine {
	readonly order: number;
	readonly text: string;
	readonly level?: number;
}

const StandingSlice = Type.Object(
	{
		agent: Id,
		level: Int,
		held: Type.Boolean({ description: "Waits at the door" }),
		solved: Type.Array(Int, { description: "The levels solved" }),
		wrongAttempts: Type.Array(Int, { description: "The minutes of wrong codes in the window" }),
		extraTools: Type.Array(Type.String({ description: "A tool name" }), { description: "The tools opened beyond the level's set" }),
		wrongOnLevel: Type.Integer({ minimum: 0, description: "Wrong codes on the current level" }),
	},
	{ description: "One resident" },
);

/** The saved state. */
export const ProgressionSlice = Type.Object(
	{
		door: Type.Optional(Type.Integer({ description: "The level whose door is shut" })),
		doorReleased: Type.Boolean({ description: "The shut door opens at the next tick" }),
		actStarts: Type.Array(Type.Object({ fromLevel: Int, tick: Int }, { description: "One act begun" }), { description: "The acts begun" }),
		endedActs: Type.Array(Int, { description: "The first levels of the acts ended" }),
		solves: Type.Array(Type.Object({ agent: Id, level: Int, tick: Int }, { description: "One solved level" }), { description: "The solved levels in order" }),
		standings: Type.Array(StandingSlice, { description: "Every resident, in roster order" }),
		offences: Type.Array(Type.Object({ agent: Id, wrong: Int, blames: Int }, { description: "The offences of one resident" }), { description: "The wrong codes and lost blames counted for the penalty ladders" }),
		delivered: Type.Array(Type.Object({ agent: Id, level: Int, finished: Type.Boolean({ description: "The finished notice was shown" }) }, { description: "One task shown" }), { description: "The tasks shown" }),
		taskLines: Type.Array(
			Type.Object({ order: Type.Integer({ description: "Its place, lowest first" }), text: Type.String({ description: "The line" }), level: Type.Optional(Int) }, { description: "One line under the task of a door-open notice" }),
			{ description: "The lines other mechanics added, in the order added" },
		),
	},
	{ description: "The saved state of the progression." },
);
type Slice = Static<typeof ProgressionSlice>;

/**
 * The last playable level.
 * @param options - The options of the mechanic.
 * @returns The level number.
 */
export function lastLevelIn(options: Pick<Options, "lastLevel" | "levels">): number {
	return options.lastLevel > 0 ? options.lastLevel : Math.max(0, ...options.levels.map((level) => level.number));
}

/**
 * A door after the last level would hold nobody: passing it is finishing.
 * @param options - The options of the mechanic.
 * @returns The level of the door, or undefined.
 */
export function doorIn(options: Pick<Options, "lastLevel" | "levels" | "holdAfter">): number | undefined {
	return options.holdAfter !== undefined && options.holdAfter < lastLevelIn(options) ? options.holdAfter : undefined;
}

/**
 * The state of a fresh run.
 * @param residents - Every resident of the run.
 * @param options - The options of the mechanic.
 * @returns The state.
 */
export function freshState(residents: readonly string[], options: Options): ProgressionState {
	const standings = new Map(residents.map((id): [string, Standing] => [id, { level: options.startLevel, held: false, solved: [], wrongAttempts: [], extraTools: new Set(), wrongOnLevel: 0 }]));
	return { standings, door: doorIn(options), doorReleased: false, actStarts: new Map(), endedActs: new Set(), solves: [], offences: new Map(), delivered: new Map(), taskLines: [] };
}

/**
 * The state as its slice.
 * @param state - The state of the run.
 * @returns The slice.
 */
export function saveState(state: ProgressionState): Slice {
	return {
		...(state.door === undefined ? {} : { door: state.door }),
		doorReleased: state.doorReleased,
		actStarts: [...state.actStarts].map(([fromLevel, tick]) => ({ fromLevel, tick })),
		endedActs: [...state.endedActs],
		solves: state.solves.map(({ agent, level, tick }) => ({ agent, level, tick })),
		standings: [...state.standings].map(([agent, entry]) => ({ agent, level: entry.level, held: entry.held, solved: [...entry.solved], wrongAttempts: [...entry.wrongAttempts], extraTools: [...entry.extraTools], wrongOnLevel: entry.wrongOnLevel })),
		offences: [...state.offences].map(([agent, count]) => ({ agent, wrong: count.wrong, blames: count.blames })),
		delivered: [...state.delivered].map(([agent, entry]) => ({ agent, level: entry.level, finished: entry.finished })),
		taskLines: state.taskLines.map(taskLineOf),
	};
}

/**
 * The state from its slice; every object is built field by field, so the key order is the straight run's (A43).
 * @param data - The saved slice.
 * @returns The state.
 */
export function loadState(data: Slice): ProgressionState {
	return {
		standings: new Map(data.standings.map((entry): [string, Standing] => [entry.agent, { level: entry.level, held: entry.held, solved: [...entry.solved], wrongAttempts: [...entry.wrongAttempts], extraTools: new Set(entry.extraTools), wrongOnLevel: entry.wrongOnLevel }])),
		door: data.door,
		doorReleased: data.doorReleased,
		actStarts: new Map(data.actStarts.map((entry) => [entry.fromLevel, entry.tick])),
		endedActs: new Set(data.endedActs),
		solves: data.solves.map(({ agent, level, tick }) => ({ agent, level, tick })),
		offences: new Map(data.offences.map((entry) => [entry.agent, { wrong: entry.wrong, blames: entry.blames }])),
		delivered: new Map(data.delivered.map((entry) => [entry.agent, { level: entry.level, finished: entry.finished }])),
		taskLines: data.taskLines.map(taskLineOf),
	};
}

/**
 * A task line built field by field (A43).
 * @param line - The line.
 * @returns A copy in the slice's key order.
 */
export function taskLineOf(line: TaskLine): TaskLine {
	return { order: line.order, text: line.text, ...(line.level === undefined ? {} : { level: line.level }) };
}

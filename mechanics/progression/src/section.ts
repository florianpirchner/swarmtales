// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The facts the gamemaker's report reads from the progression (decisions A73, A74): `section`, carried from the old
 * `mechanics/progression/src/section.ts` (`computeProgressionSection`), in the shape of `ProgressionSectionSchema`
 * of `mechanics/city-directors/src/gamemaker/report/progression.ts`; and `tracks`, per resident the tick it entered
 * its level and its wrong codes there (the old gamemaker's `levelSince` and `wrongOnLevel`, from `level_up` and an
 * incorrect `submission`). The renderers stay with the gamemaker.
 */
import { Type, type Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import type { ViewOf } from "@swarmtales/sdk";
import type { progressionHead } from "./head.ts";
import { lastLevelIn, type Standing } from "./model.ts";
import { penaltyAt } from "./levels.ts";

type View = ViewOf<typeof progressionHead>;

const Int = (description: string) => Type.Integer({ description });
const Id = Type.String({ description: "A resident id" });

/** Task placeholders that name teammates; a task without them hides its team (old `TEAM_PLACEHOLDERS`). */
const TEAM_PLACEHOLDERS: readonly string[] = ["members", "partner", "leader"];
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

const Place = Type.Union(
	[
		Type.Object({ kind: Type.Literal("alive", { description: "In the city" }) }, { description: "In the city" }),
		Type.Object({ kind: Type.Literal("gate", { description: "At the gate" }), until: Int("The tick the gate closes") }, { description: "At the gate" }),
		Type.Object({ kind: Type.Literal("exiled", { description: "Gone" }) }, { description: "Exiled" }),
	],
	{ description: "Where a resident stands" },
);

/**
 * The value of the fact `progression.section` (old `ProgressionSectionFact`). Its `minute` is the minute of the
 * round the gamemaker's look follows: the look runs at the start of tick t, after round t, whose minute was t - 1
 * (erratum J126); 0 before the first round.
 *
 * @public
 */
export const ProgressionSectionFact = Type.Object(
	{
		minute: Int("The minute of the round just played: the tick minus one, at least 0"),
		rules: Type.Object(
			{
				penalty: Type.Union([Type.Integer({ description: "One price" }), Type.Array(Type.Integer({ description: "A step" }), { description: "A ladder" })], { description: "The price of a wrong code" }),
				maxAttemptsPerWindow: Int("Wrong attempts per window"),
				attemptWindowMinutes: Int("The window in ticks"),
				rewards: Type.Array(Type.Object({ level: Int("The level"), reward: Type.Number({ description: "Its reward" }) }, { description: "One level" }), { description: "The reward of every played level" }),
				survivors: Int("Who remains at the end"),
				residents: Int("Every resident of the run"),
			},
			{ description: "The rules the header names" },
		),
		ranking: Type.Array(
			Type.Object(
				{
					agent: Id,
					points: Type.Number({ description: "Its points" }),
					rank: Int("Its rank"),
					level: Int("Its level"),
					standing: Place,
					finished: Type.Boolean({ description: "Passed every level" }),
					waiting: Type.Union([Int("The level it passed"), Type.Null({ description: "Not held" })], { description: "The level it waits after while the door is shut" }),
					nextPenalty: Type.Number({ description: "The price of its next wrong code" }),
					open: Type.Number({ description: "The rewards still open to it" }),
				},
				{ description: "One resident's line" },
			),
			{ description: "The ranking" },
		),
		alive: Type.Array(Id, { description: "The residents in the city, in the run's order" }),
		standing: Type.Array(Type.Object({ agent: Id, level: Int("Its level"), teamPlaceholders: Type.Boolean({ description: "The level's task names teammates" }) }, { description: "One resident" }), {
			description: "Who stands on a level and may wait on teammates there",
		}),
	},
	{ description: "The progression's part of the gamemaker's report" },
);

/**
 * The value of the fact `progression.tracks`: per resident, in roster order, the tick it entered its current level
 * (the tick of its last `level_up`, 0 before any) and its wrong codes since (old `levelSince`, `wrongOnLevel`).
 *
 * @public
 */
export const ProgressionTracksFact = Type.Array(
	Type.Object({ agent: Id, levelSince: Int("The tick it entered its current level"), wrongOnLevel: Int("Wrong codes on its current level") }, { description: "One resident's track" }),
	{ description: "The tracks of every resident" },
);

type Section = Static<typeof ProgressionSectionFact>;

// The played levels, from the first to the last (old `levelRange`).
function levelRange(view: View): readonly number[] {
	const first = view.options.startLevel;
	return Array.from({ length: Math.max(0, lastLevelIn(view.options) - first + 1) }, (_, index) => first + index);
}

function rewardOf(view: View, level: number): number {
	return view.options.levels.find((entry) => entry.number === level)?.reward ?? 0;
}

// The banished last, then by points, by level and by id (old `ranking()`).
function ranked(view: View): readonly { agent: string; entry: Standing; points: number }[] {
	const exiled = (agent: string): number => (view.tryCall(ExileService, "isExiled", { resident: agent }) === true ? 1 : 0);
	return [...view.state.standings]
		.map(([agent, entry]) => ({ agent, entry, points: view.call(LedgerService, "balance", { account: agent }) }))
		.sort((a, b) => exiled(a.agent) - exiled(b.agent) || b.points - a.points || b.entry.level - a.entry.level || a.agent.localeCompare(b.agent));
}

function rankingOf(view: View): Section["ranking"] {
	const last = lastLevelIn(view.options);
	const levels = levelRange(view);
	const ladder = view.options.penalty ?? 0;
	return ranked(view).map(({ agent, entry, points }, index) => ({
		agent,
		points,
		rank: index + 1,
		level: entry.level,
		standing: view.tryCall(ExileService, "standing", { resident: agent }) ?? { kind: "alive" },
		finished: entry.level > last,
		waiting: entry.held ? entry.level : null,
		nextPenalty: penaltyAt(ladder, (view.state.offences.get(agent)?.wrong ?? 0) + 1),
		open: levels.filter((level) => level >= entry.level).reduce((sum, level) => sum + rewardOf(view, level), 0),
	}));
}

// Who stands on a level of the game: in the city, not finished, not held at a door.
function onLevels(view: View, alive: readonly string[]): Section["standing"] {
	const last = lastLevelIn(view.options);
	return alive.flatMap((agent) => {
		const entry = view.state.standings.get(agent);
		if (entry === undefined || entry.level > last || entry.held) return [];
		const definition = view.options.levels.find((level) => level.number === entry.level);
		if (definition === undefined) return [];
		const named = [...definition.task.matchAll(PLACEHOLDER)].some((match) => TEAM_PLACEHOLDERS.includes(match[1] ?? ""));
		return [{ agent, level: entry.level, teamPlaceholders: named }];
	});
}

/**
 * The fact `section`, computed when it is read.
 *
 * @param view - The progression's view.
 * @returns The section's data.
 */
export function computeSection(view: View): Section {
	const { options } = view;
	const ladder = options.penalty ?? 0;
	const alive = view.tryCall(ExileService, "alive", {}) ?? view.residents.ids;
	return {
		minute: Math.max(0, view.tick - 1),
		rules: {
			penalty: typeof ladder === "number" ? ladder : [...ladder],
			maxAttemptsPerWindow: options.maxAttemptsPerWindow,
			attemptWindowMinutes: options.attemptWindowMinutes,
			rewards: levelRange(view).map((level) => ({ level, reward: rewardOf(view, level) })),
			survivors: options.survivors,
			residents: view.residents.ids.length,
		},
		ranking: rankingOf(view),
		alive: [...alive],
		standing: onLevels(view, alive),
	};
}

/**
 * The fact `tracks`: a resident entered its level at the tick of its last solve, which wrote its `level_up` (also
 * at a shut door, whose opening writes none).
 *
 * @param view - The progression's view.
 * @returns The tracks in roster order.
 */
export function computeTracks(view: View): Static<typeof ProgressionTracksFact> {
	return [...view.state.standings].map(([agent, entry]) => ({
		agent,
		levelSince: view.state.solves.reduce((latest, solve) => (solve.agent === agent ? Math.max(latest, solve.tick) : latest), 0),
		wrongOnLevel: entry.wrongOnLevel,
	}));
}

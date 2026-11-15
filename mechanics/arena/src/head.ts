// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The head of the `arena` mechanic: the old arena's game rules as options (the stop rules, the rewards still open,
 * the acts and their brakes), its state with the snapshot, its events and the services it asks. The budget and the
 * snapshot checkpoint of the old arena are the platform's now (decision A57).
 */
import { Type, type Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { RunFrameEvents, TribunalViewService } from "./contract.ts";

const Level = Type.Integer({ minimum: 1, description: "A level number" });

/**
 * The options of the arena (the old `ArenaOptions` without the budget and the snapshot).
 *
 * @public
 */
export const RunFrameOptions = Type.Object({
	story: Type.String({ default: "", description: "The game's old story id, as `run_start` names it." }),
	meta: Type.Optional(Type.Record(Type.String({ description: "A label" }), Type.String({ description: "Its value" }), { description: "The run's labels, logged in `run_start`." })),
	stopWhenDone: Type.Boolean({ default: false, description: "End the run as soon as every resident in the city has passed the last level." }),
	stopWhenSeatsDecided: Type.Boolean({ default: false, description: "End the run once open rewards can no longer change who survives." }),
	rewards: Type.Array(Type.Object({ level: Level, reward: Type.Number({ description: "Its reward" }) }, { description: "One level's reward" }), {
		default: [],
		description: "The reward of every level: what is still open to a resident, for `stopWhenSeatsDecided`.",
	}),
	acts: Type.Array(
		Type.Object(
			{
				title: Type.String({ description: "The act's title" }),
				fromLevel: Level,
				maxMinutes: Type.Optional(Type.Integer({ minimum: 1, description: "The act's brake: ticks after its start before `act_brake` is written." })),
			},
			{ description: "One act" },
		),
		{ default: [], description: "The acts in the game's order, for their brakes." },
	),
	tribunalAct: Type.Optional(Type.Integer({ minimum: 1, description: "The first level of the tribunal's act: the tribunal ends that act, it has no brake." })),
});

/**
 * The slice of the arena (old `ArenaSnapshot`, version 1): the points each resident saw last and the acts whose brake
 * fired.
 *
 * @public
 */
export const RunFrameSlice = Type.Object(
	{
		seenPoints: Type.Array(Type.Object({ agent: Type.String({ description: "A resident id" }), points: Type.Number({ description: "The points it saw" }) }, { description: "One resident" }), { description: "The points part of the novelty" }),
		braked: Type.Array(Type.Integer({ description: "The first level of an act" }), { description: "The acts whose brake fired" }),
	},
	{ description: "The arena's slice" },
);

/**
 * The state of the arena: the slice, and what lives within one tick (who was activated, the points at a turn's
 * inputs, whether the tick's stop check is due) or until the end (the reason).
 *
 * @public
 */
export interface RunFrameState {
	/** Every resident, in the game's order: the slice lists them so (old `snapshot()`). */
	readonly residents: readonly string[];
	/** Resident to the points it saw at the end of its last turn. */
	readonly seenPoints: Map<string, number>;
	/** The acts whose brake fired. */
	readonly braked: Set<number>;
	/** Who was activated this tick (old `activated`). */
	readonly activated: Set<string>;
	/** Set when a tick after the first starts, cleared by its first activation: the old `#nextMinute` stop check. */
	stopDue: boolean;
	/** The end reason once decided (old `reason`). */
	reason: string | undefined;
}

function fresh(residents: readonly string[]): RunFrameState {
	return { residents, seenPoints: new Map(), braked: new Set(), activated: new Set(), stopDue: false, reason: undefined };
}

function save(state: RunFrameState): Static<typeof RunFrameSlice> {
	return {
		seenPoints: state.residents.flatMap((agent) => {
			const points = state.seenPoints.get(agent);
			return points === undefined ? [] : [{ agent, points }];
		}),
		braked: [...state.braked].sort((a, b) => a - b),
	};
}

function load(data: Static<typeof RunFrameSlice>, residents: readonly string[]): RunFrameState {
	const slice = inSchemaOrder(RunFrameSlice, data);
	const state = fresh(residents);
	for (const { agent, points } of slice.seenPoints) state.seenPoints.set(agent, points);
	for (const level of slice.braked) state.braked.add(level);
	return state;
}

/**
 * The head of the arena: everything that can be read without running a handler.
 *
 * @public
 */
export const runFrameHead = defineHead({
	id: "arena",
	package: "@swarmtales/mechanic-arena",
	summary: "The City's run frame reduced to its game rules: start and end, the standings per tick, the stop rules and the act brakes.",
	options: RunFrameOptions,
	state: RunFrameSlice,
	start: ({ residents }): RunFrameState => fresh(residents),
	snapshot: { save: (state: RunFrameState) => save(state), load: (data, { residents }): RunFrameState => load(data, residents) },
	events: RunFrameEvents.events,
	// The levels, the ranking and the acts; the points.
	requires: [ProgressionService, LedgerService],
	// Who is banished, and the tribunal's end: each when a provider is loaded (old `ending` has no provider and is dropped).
	uses: [ExileService, TribunalViewService],
});

/**
 * The context of the arena's hooks.
 *
 * @public
 */
export type RunFrameCtx = CtxOf<typeof runFrameHead>;

/**
 * The read-only view of the arena's facts and limits.
 *
 * @public
 */
export type RunFrameView = ViewOf<typeof runFrameHead>;

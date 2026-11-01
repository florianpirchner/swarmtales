/**
 * The head of the `arena` mechanic (carve step 18, docs/design/carve-plan.md): the old `Arena`'s
 * run settings as options, its four events in the old shape (chronicle event-schema.ts) and the
 * APIs it reads. The turn loop itself is the host's; the arena gives it the old policy
 * (`legacyTurns`) and keeps what the old arena decided around it: the run's start and end lines,
 * the round's standings, the stop reasons, the budget, the act brakes and when a snapshot is due.
 */
import { Type } from "typebox";
import type { ContextOf, ViewOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { EndingApi, ExileApi, LedgerApi, ProgressionApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { ArenaState } from "./state.ts";

const Id = Type.String();
const Int = Type.Integer();

const Act = Type.Object({
	title: Type.String(),
	fromLevel: Type.Integer({ minimum: 1 }),
	maxMinutes: Type.Optional(Type.Integer({ minimum: 1, description: "The act's brake: minutes after its start before the run logs `act_brake` (v08)." })),
});

export const ArenaOptions = Type.Object({
	story: Type.String({ description: "The story's id, as `run_start` names it (the old `world.story.id`)." }),
	meta: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "The run's labels, logged in `run_start` (the old `ArenaOptions.meta`)." })),
	stopWhenDone: Type.Boolean({ default: false, description: "End the run as soon as every resident in the city has passed the last level." }),
	stopWhenSeatsDecided: Type.Boolean({ default: false, description: "End the run once open rewards can no longer change who survives." }),
	rewards: Type.Array(Type.Object({ level: Type.Integer({ minimum: 1 }), reward: Type.Number() }), {
		default: [],
		description: "The reward of every level of the story (`levels[].reward`): what is still open to a resident, for `stopWhenSeatsDecided`.",
	}),
	acts: Type.Array(Act, { default: [], description: "The story's acts in its order (`story.acts`), for their brakes." }),
	tribunalAct: Type.Optional(Type.Integer({ minimum: 1, description: "The first level of the tribunal's act (`tribunal.act`, else the start level): the tribunal ends that act, it has no brake." })),
	budgetUsd: Type.Optional(Type.Number({ minimum: 0, description: "End the run once this run's model spend (its `usage` app events) exceeds it (`run.budgetUsd`)." })),
	snapshot: Type.Optional(
		Type.Object(
			{
				afterLevel: Type.Integer({ minimum: 1 }),
				atMinute: Type.Optional(Type.Integer({ minimum: 0, description: "Due at the first minute's end at or after this minute instead." })),
				stop: Type.Boolean({ description: "End the run right after the snapshot." }),
				file: Type.String({ description: "Where the app writes the snapshot, for the run's end reason." }),
			},
			{ description: "The run snapshot the app takes once every resident has passed `afterLevel` (SPEC 17); the fact `arena.snapshot` says when." },
		),
	),
});

const Standing = Type.Object({ agent: Id, level: Int, points: Type.Number(), rank: Int, tools: Int, activated: Type.Boolean() });
const Behind = Type.Array(Type.Object({ agent: Id, level: Int }));

/** The old events of the arena, payload keys in the old order. */
const events = {
	run_start: Type.Object({ story: Type.String(), agents: Type.Array(Id), minutes: Int, seed: Int, meta: Type.Optional(Type.Record(Type.String(), Type.String())) }),
	round_end: Type.Object({ round: Int, standings: Type.Array(Standing) }),
	act_brake: Type.Object({ act: Type.String(), fromLevel: Int, toLevel: Int, startedAt: Int, maxMinutes: Int, behind: Behind, snapshot: Type.Optional(Type.Boolean()) }),
	run_end: Type.Object({
		reason: Type.Optional(Type.String()),
		standings: Type.Array(Standing),
		ending: Type.Optional(Type.Object({ id: Type.String(), title: Type.String(), summary: Type.Optional(Type.String()) })),
	}),
};

export const arenaHead = defineHead({
	id: "arena",
	summary: "The old arena's run events and turn policy: start and end, standings, stop reasons, budget, act brakes and the snapshot cut.",
	options: ArenaOptions,
	state: ({ residents }) => new ArenaState(residents),
	events,
	requires: [ProgressionApi, LedgerApi],
	uses: [ExileApi, TribunalViewApi, EndingApi],
});

export type ArenaCtx = ContextOf<typeof arenaHead>;
export type ArenaView = ViewOf<typeof arenaHead>;

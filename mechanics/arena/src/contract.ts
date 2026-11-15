// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `arena`: its events in the old shape, and what its stop rule asks of the tribunal
 * (`tribunal-view`, provided by `tribunal`). The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Int = (description: string) => Type.Integer({ description });

/**
 * One row of the standings (old `#standings`): `tools` counts the tools open to the resident now, `activated` says
 * whether it was activated in the tick.
 *
 * @public
 */
export const Standing = Type.Object(
	{
		agent: Id,
		level: Int("Its level"),
		points: Type.Number({ description: "Its points" }),
		rank: Int("Its place, from 1"),
		tools: Int("The tools open to it now"),
		activated: Type.Boolean({ description: "True when it was activated in the tick" }),
	},
	{ description: "One resident's place" },
);

const Standings = Type.Array(Standing, { description: "Every resident in ranking order" });
const Behind = Type.Array(Type.Object({ agent: Id, level: Int("Its level") }, { description: "A resident still inside the act" }), { description: "Who is still inside the act" });

/**
 * The events of the arena, payload keys in the old order.
 *
 * @public
 */
export const RunFrameEvents = defineEvents("arena", {
	run_start: Type.Object(
		{
			story: Type.String({ description: "The game's old story id" }),
			agents: Type.Array(Id, { description: "Every resident, in the game's order" }),
			minutes: Int("The ticks the game plays"),
			seed: Int("The seed of the run"),
			meta: Type.Optional(Type.Record(Type.String({ description: "A label" }), Type.String({ description: "Its value" }), { description: "The run's labels" })),
		},
		{ description: "The run began; written after every other mechanic's start" },
	),
	round_end: Type.Object({ round: Int("The old round: the tick plus one"), standings: Standings }, { description: "The standings after a tick's turns" }),
	act_brake: Type.Object(
		{ act: Type.String({ description: "The act's title" }), fromLevel: Int("Its first level"), toLevel: Int("Its last level"), startedAt: Int("The tick it began"), maxMinutes: Int("Its brake, in ticks"), behind: Behind },
		{ description: "An act ran its `maxMinutes` with residents still inside it; written once per act" },
	),
	run_end: Type.Object(
		{ reason: Type.Optional(Type.String({ description: "Why the run stopped, when a stop rule named it" })), standings: Standings },
		{ description: "The run is over: the reason and the last standings, after every other mechanic's end" },
	),
});

const None = Type.Object({}, { additionalProperties: false, description: "No input" });

/**
 * What the stop rule of `arena` reads of the tribunal (the old `TribunalViewApi.stop`): the service `tribunal-view`,
 * provided by `tribunal`. Only `arena` asks; the tribunal asks the arena nothing.
 *
 * @public
 */
export const TribunalViewService = defineService({
	name: "tribunal-view",
	summary: "What the run's stop rule reads of the tribunal.",
	methods: {
		stop: {
			kind: "query",
			summary: "The end reason once the target is reached and the last gate closed, whether a tribunal is under way, and whether the city still pursues its target.",
			input: None,
			output: Type.Object(
				{
					endReason: Type.Union([Type.String({ description: "The reason" }), Type.Null({ description: "Not over" })], { description: "The end of the tribunal's act, or null" }),
					busy: Type.Boolean({ description: "True while a tribunal runs to its last gate" }),
					pursuing: Type.Boolean({ description: "True while the city still pursues its target" }),
				},
				{ additionalProperties: false, description: "The tribunal as the stop rule reads it" },
			),
		},
	},
});

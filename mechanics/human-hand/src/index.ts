// SPDX-License-Identifier: Apache-2.0
/**
 * The `humanHand` mechanic: the tools of the Human Hand, `pause` and `resume`. A pause holds no tick back by itself;
 * it is the fact `humanHand.paused`, which the run loop reads between two ticks. A cut of the old `HumanDesk`
 * (`packages/kernel/src/host/human.ts`): `instruct`, `step` and the inbox are not here.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";

const Reason = Type.Optional(Type.String({ maxLength: 500, description: "Why the run is paused; written to the log." }));

const head = defineHead({
	id: "humanHand",
	package: "@swarmtales/mechanic-human-hand",
	summary: "The tools of the Human Hand: pause and resume a run between two ticks.",
	state: Type.Object({ paused: Type.Boolean({ description: "True from a pause to the next resume." }) }, { description: "The state of humanHand." }),
	start: () => ({ paused: false }),
	events: {
		paused: Type.Object({ reason: Reason }, { additionalProperties: false, description: "The Human Hand paused the run." }),
		resumed: Type.Object({}, { additionalProperties: false, description: "The Human Hand let the run go on." }),
	},
	tools: {
		pause: { description: "Halt the run at the next tick boundary until you resume.", params: Type.Object({ reason: Reason }, { description: "The arguments of pause." }), for: ["human"] },
		resume: { description: "Let a halted run go on.", params: Type.Object({}, { description: "The arguments of resume." }), for: ["human"] },
	},
});

/**
 * The `humanHand` mechanic: the tools `pause` and `resume` of the grant `human`, the events `paused` and `resumed`,
 * and the fact `humanHand.paused`. Calling it gives the use for a game's `mechanics` list.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "guess", residents: 2, mechanics: [guessNumber(), humanHand()], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const humanHand = defineMechanic(head, {
	tools: {
		pause: {
			check: (_params, ctx) => (ctx.state.paused ? refuse("ALREADY_PAUSED", "the run is paused already") : undefined),
			run: (params, ctx) => {
				ctx.state.paused = true;
				ctx.emit("paused", params.reason === undefined ? {} : { reason: params.reason });
				return reply("the run halts at the next tick boundary");
			},
		},
		resume: {
			check: (_params, ctx) => (ctx.state.paused ? undefined : refuse("NOT_PAUSED", "the run is not paused")),
			run: (_params, ctx) => {
				ctx.state.paused = false;
				ctx.emit("resumed", {});
				return reply("the run goes on");
			},
		},
	},
	facts: {
		paused: { output: Type.Boolean({ description: "True while the run is paused." }), compute: (view) => view.state.paused },
	},
});

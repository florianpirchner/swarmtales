// SPDX-License-Identifier: Apache-2.0
/** The options of the scheduler sample `parallel` (specification of M4, section 3.2). */
import { InputEntrySchema } from "@swarmtales/engine";
import { Type, type Static } from "typebox";

/**
 * The options of `parallel`; every field has a default.
 *
 * @public
 */
export const ParallelOptions = Type.Object(
	{
		activations: Type.Integer({ minimum: 1, default: 1, description: "Activations an actor gets in one tick at most" }),
		activation: Type.Union([Type.Literal("onNews"), Type.Literal("always"), Type.Literal("toAct")], { default: "onNews", description: "Who of the residents is woken" }),
		kinds: Type.Array(Type.String({ description: "An actor kind." }), { default: ["resident"], description: "The actor kinds this scheduler activates; a kind other than resident is woken by news only" }),
		inputs: Type.Array(InputEntrySchema, { default: [], description: "The order of an activation's input lines, as in turns" }),
	},
	{ description: "The options of the scheduler sample parallel." },
);

/**
 * The parsed options of `parallel`.
 *
 * @public
 */
export type ParallelOptions = Static<typeof ParallelOptions>;

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Small schema builders of the facts the gamemaker reads; each schema carries its description. */
import { Type } from "typebox";

/**
 * A whole number.
 *
 * @param description - What it counts.
 * @returns The schema.
 */
export const Int = (description: string) => Type.Integer({ description });

/**
 * A resident id.
 *
 * @param description - Whose id.
 * @returns The schema.
 */
export const Id = (description = "A resident id") => Type.String({ description });

/**
 * A list of resident ids.
 *
 * @param description - Who they are.
 * @returns The schema.
 */
export const Ids = (description: string) => Type.Array(Id(), { description });

/** Where a resident stands (old `Standing` of `mechanics/shared`): in the city, at the gate until a tick, or gone. */
export const Standing = Type.Union(
	[
		Type.Object({ kind: Type.Literal("alive", { description: "In the city" }) }, { description: "In the city" }),
		Type.Object({ kind: Type.Literal("gate", { description: "At the gate" }), until: Int("The tick the gate closes") }, { description: "At the gate" }),
		Type.Object({ kind: Type.Literal("exiled", { description: "Gone" }) }, { description: "Exiled" }),
	],
	{ description: "Where a resident stands" },
);

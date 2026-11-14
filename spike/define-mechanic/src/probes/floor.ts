/**
 * Where the floor of a completion comes from (measure/completion-time.mjs --floor): the same
 * request on a value of a Typebox schema alone, and on today's mechanic context alone, without
 * any mechanic.
 */
import { Type, type Static, type TSchema } from "typebox";
import type { EventSchemas, MechanicContext, MechanicShape, Shape, StateSetup } from "@swarmtales/contracts";
import type { None } from "../define.ts";

const Sample = Type.Object({ name: Type.String(), count: Type.Integer() });

export function ofSchema(value: Static<typeof Sample>): string {
	const anchorSchema = value.name;
	return anchorSchema;
}

export function ofContext(ctx: MechanicContext<MechanicShape>): number {
	const anchorContext = ctx.minute;
	return anchorContext;
}

/** A head with one type parameter: an options schema, and a function typed by it. */
function withOptions<O extends TSchema>(spec: { readonly options: O; start(setup: StateSetup<O>): number }): O {
	return spec.options;
}

export const one = withOptions({
	options: Sample,
	start: (setup) => {
		const anchorOne = setup.seed;
		return anchorOne;
	},
});

/** A head with options and events, and a handler typed by today's context of that shape. */
function withContext<O extends TSchema, E extends EventSchemas>(spec: { readonly options: O; readonly events: E; run(ctx: MechanicContext<Shape<O, undefined, E, None, [], []>>): number }): O {
	return spec.options;
}

export const two = withContext({
	options: Sample,
	events: { counted: Type.Object({ count: Type.Integer() }) },
	run: (ctx) => {
		const anchorTwo = ctx.minute;
		return anchorTwo;
	},
});

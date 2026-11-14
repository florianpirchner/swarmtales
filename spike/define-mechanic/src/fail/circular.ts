/**
 * Minimal reproduction: a helper outside the one object that takes the mechanic's context. The
 * context type comes from the mechanic, the mechanic's type comes from its handlers, and a handler
 * calls the helper: TypeScript reports a circular reference.
 */
import { Type } from "typebox";
import { reply } from "@swarmtales/kernel";
import { mechanic, type CtxOf } from "../define.ts";

type Ctx = CtxOf<typeof counter>;

function bump(ctx: Ctx): number {
	ctx.state.count += 1;
	return ctx.state.count;
}

export const counter = mechanic({
	id: "counter",
	summary: "Counts calls.",
	state: Type.Object({ count: Type.Integer() }),
	prompts: { "counter/tools/bump": [] },
	start: () => ({ count: 0 }),
	tools: {
		bump: {
			description: "counter/tools/bump",
			params: Type.Object({}),
			run: (_params, ctx) => reply(String(bump(ctx))),
		},
	},
});

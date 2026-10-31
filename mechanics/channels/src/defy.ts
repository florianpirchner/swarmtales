/**
 * `defy` (the gamemaker's direction at 10): a resident refuses an order of the gamemaker, for a
 * reason of its own character. Copied from packages/engine/src/tools/defy.ts and `World#defyGamemaker`;
 * the reason goes to the log as `gamemaker_defied`, no other resident learns of it. The tool is
 * locked for every resident unless the story lets all (`defiance`) or only the whisperer
 * (`whispererDefies`) use it.
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import type { channelsHead } from "./head.ts";
import { selfOf } from "./messages.ts";

type Kit = MechanicKit<ShapeOf<typeof channelsHead>>;

/** The length of a reason, in characters, after trimming. */
export const DEFY_REASON = { min: 20, max: 600 } as const;

export function defyTool(kit: Kit) {
	return kit.tool({
		name: "defy",
		description: { prompt: "tools/defy", variables: () => ({ min: DEFY_REASON.min, max: DEFY_REASON.max }) },
		parameters: Type.Object({
			reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
			note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
		}),
		suggest: ["resident"],
		execute: ({ reason, note }, ctx) => {
			const text = reason.trim();
			if (text.length < DEFY_REASON.min || text.length > DEFY_REASON.max) return refuse("INVALID_REASON", `${String(DEFY_REASON.min)}-${String(DEFY_REASON.max)} characters`);
			ctx.emit("gamemaker_defied", { agent: selfOf(ctx), reason: text, ...(note === undefined ? {} : { note }) });
			return reply(ctx.prompt("replies/defy-recorded", {}));
		},
	});
}

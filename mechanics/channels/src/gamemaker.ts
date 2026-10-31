/**
 * The gamemaker's tools of channels (carve step 17): a private numbered note and a post on the
 * board, signed with the courier's name. Copied from packages/roles/src/gamemaker/gamemaker.ts
 * (`#notifyTool`, `#postTool`, the signature and length part of `#checked`).
 *
 * Not carried over, because they read other mechanics' secrets and belong to the role's guard
 * (docs/design/carve-requests-T2.md, request 4): the leak, private-thought, core, role and repeat
 * checks, and the note budgets (a story limit `{ minutes }` on the tool does the budgets).
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { CITY } from "./groups.ts";
import type { channelsHead } from "./head.ts";
import { isGone, note, postToBoard, type Ctx } from "./messages.ts";

type Kit = MechanicKit<ShapeOf<typeof channelsHead>>;

/** Models sign anyway, or head a post like the report's lines ("CITY minute 30:"); the author's name is added for them. */
function checked(ctx: Ctx, raw: string): string | undefined {
	const author = ctx.options.noteAuthor;
	const trimmed = raw
		.trim()
		.replace(new RegExp(`^${author}\\s*[:,-]\\s*`, "i"), "")
		.replace(new RegExp(`^(?:(?:${author}|${CITY})\\s+)?minute\\s+\\d+\\s*[:,-]\\s*`, "i"), "")
		.trim();
	return trimmed.length === 0 || trimmed.length > ctx.options.noteMaxLength ? undefined : trimmed;
}

export function gamemakerTools(kit: Kit) {
	return [
		kit.tool({
			name: "notify",
			description: "gamemaker/tools/notify",
			parameters: Type.Object({ agent: Type.String({ description: "Resident name or ID, e.g. A04" }), text: Type.String({ description: "The note" }) }),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			rule: (params, ctx) => {
				if (!ctx.residents.has(params.agent)) return refuse("UNKNOWN_AGENT", params.agent);
				if (isGone(ctx, params.agent)) return refuse("EXILED", `${params.agent} was exiled; nothing reaches them beyond the wall`);
				return checked(ctx, params.text) === undefined ? refuse("INVALID_TEXT", `1-${String(ctx.options.noteMaxLength)} characters`) : undefined;
			},
			execute: (params, ctx) => {
				const text = checked(ctx, params.text);
				if (text === undefined) return refuse("INVALID_TEXT", `1-${String(ctx.options.noteMaxLength)} characters`);
				const number = note(ctx, params.agent, ctx.options.noteAuthor, text);
				return reply(ctx.prompt("gamemaker/replies/delivered", { agent: params.agent, number }));
			},
		}),
		kit.tool({
			name: "postBoard",
			description: "gamemaker/tools/postBoard",
			parameters: Type.Object({ text: Type.String({ description: "The post" }) }),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			rule: (params, ctx) => (checked(ctx, params.text) === undefined ? refuse("INVALID_TEXT", `1-${String(ctx.options.noteMaxLength)} characters`) : undefined),
			execute: (params, ctx) => {
				const text = checked(ctx, params.text);
				if (text === undefined) return refuse("INVALID_TEXT", `1-${String(ctx.options.noteMaxLength)} characters`);
				const post = postToBoard(ctx, ctx.options.noteAuthor, text, "city");
				return reply(ctx.prompt("gamemaker/replies/posted", { number: post.seq }));
			},
		}),
	];
}

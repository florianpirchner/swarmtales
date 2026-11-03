/**
 * The gamemaker's tools of channels (carve step 17): a private numbered note and a post on the
 * board, signed with the courier's name. Copied from packages/roles/src/gamemaker/gamemaker.ts
 * (`#notifyTool`, `#postTool`) in the old order of checks: unknown resident, exiled, the text
 * (`checkNote`), the budget. The checks, the budgets and the `gamemaker_note` line are the note
 * desk's (notes.ts, `NotesApi`), which every gamemaker tool of every mechanic calls the same way.
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import type { channelsHead } from "./head.ts";
import { isGone, note, postToBoard } from "./messages.ts";
import { budgetRefusal, checkNote, recordNote, refusalFor, refusalOf } from "./notes.ts";

type Kit = MechanicKit<ShapeOf<typeof channelsHead>>;

/**
 * The old tools' longest text (`MAX_NOTE_LENGTH`), as their parameters described it. The schemas
 * reach the model with the tool list, so their words are pinned bytes (step 18, C2: the gamemaker
 * overseer's golden replay counts them in the scripted model's usage); `noteMaxLength` still decides.
 */
const OLD_MAX_NOTE = 400;

export function gamemakerTools(kit: Kit) {
	return [
		kit.tool({
			name: "notify",
			description: "gamemaker/tools/notify",
			parameters: Type.Object({ agent: Type.String({ description: "Resident name or ID, e.g. A04" }), text: Type.String({ description: `The note, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			execute: (params, ctx) => {
				if (!ctx.residents.has(params.agent)) return refuse("UNKNOWN_AGENT", params.agent);
				if (isGone(ctx, params.agent)) return refusalFor(refusalOf(ctx.prompt("gamemaker/replies/exiled", { agent: params.agent })));
				const checked = checkNote(ctx, params.text, params.agent);
				if (!checked.ok) return refusalFor(checked);
				const spent = budgetRefusal(ctx, params.agent);
				if (spent !== undefined) return spent;
				const number = note(ctx, params.agent, ctx.options.noteAuthor, checked.text);
				recordNote(ctx, params.agent, checked.text, number);
				return reply(ctx.prompt("gamemaker/replies/delivered", { agent: params.agent, number }));
			},
		}),
		kit.tool({
			name: "postBoard",
			description: "gamemaker/tools/postBoard",
			parameters: Type.Object({ text: Type.String({ description: `The post, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			execute: (params, ctx) => {
				const checked = checkNote(ctx, params.text, "board");
				if (!checked.ok) return refusalFor(checked);
				const spent = budgetRefusal(ctx, "board");
				if (spent !== undefined) return spent;
				const post = postToBoard(ctx, ctx.options.noteAuthor, checked.text, "city");
				recordNote(ctx, "board", checked.text, post.seq);
				return reply(ctx.prompt("gamemaker/replies/posted", { number: post.seq }));
			},
		}),
	];
}

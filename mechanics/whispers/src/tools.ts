/**
 * The tools of the whispers mechanic: the whisperer's `forgeReceipt` and the popularity vote's
 * `nameFavourite`. Copied from packages/engine/src/tools/whispers.ts and the whisper methods of
 * world.ts. `defy` and `gamemaker_defied` belong to channels (round 2, R2-D5).
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, MarksApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import { isForgeable } from "./duty.ts";
import type { ToolCtx, whispersHead } from "./head.ts";
import { dmReceiptOf, inCity, marksSuffix, roundsOf } from "./view.ts";

type Kit = MechanicKit<ShapeOf<typeof whispersHead>>;

const CITY = "CITY";
const MAX_DM_LENGTH = 800;

export function forgeTool(kit: Kit) {
	return kit.tool({
		name: "forgeReceipt",
		description: "tools/forgeReceipt",
		parameters: Type.Object({
			to: Type.String({ description: "The resident who sees it (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
			receiptId: Type.String({ description: "Receipt ID of a DM someone sent you, e.g. R-0042", minLength: 1, maxLength: 16 }),
			text: Type.String({ description: "The text the receipt quotes", minLength: 1, maxLength: MAX_DM_LENGTH }),
		}),
		suggest: ["resident"],
		execute: ({ to, receiptId, text }, ctx: ToolCtx) => {
			const agent = ctx.resident;
			if (agent === undefined) return refuse("UNKNOWN_AGENT");
			const found = ctx.call(ReceiptsApi, "get", { id: receiptId });
			if (found === null) return refuse("UNKNOWN_RECEIPT", receiptId);
			if (!found.parties.includes(agent)) return refuse("NOT_A_PARTY", receiptId);
			const row = dmReceiptOf(found);
			if (row === undefined || !isForgeable(row, agent)) return refuse("NOT_FORGEABLE", "only the receipt of a DM another resident sent to you");
			if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
			if (to === agent) return refuse("SELF_TARGET", "show it to another resident");
			if (!inCity(ctx, to)) return refuse("EXILED", `${to} was exiled`);
			const forged = text.trim();
			if (forged.length === 0 || forged.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
			if (!ctx.call(MarksApi, "canAfford", { resident: agent, channel: "receipt" })) return refuse("NO_MARKS");
			const line = ctx.prompt("records/receipt-forged-line", { id: row.id, number: row.number, from: row.from, to: row.to, minute: row.minute, quoted: JSON.stringify(forged) });
			ctx.call(ChannelsApi, "notify", { to, author: CITY, text: ctx.prompt("notices/receipt-forged", { by: agent, line }) });
			ctx.state.forgeries.push({ minute: ctx.minute, to });
			ctx.emit("receipt_forged", { receipt: row.id, by: agent, to, from: row.from, number: row.number, text: row.text ?? "", forged });
			ctx.call(MarksApi, "spend", { resident: agent, channel: "receipt" });
			return reply(`${ctx.prompt("replies/receipt-shown-private", { to, receipt: row.id })}${marksSuffix(ctx, agent)}`);
		},
	});
}

export function favouriteTool(kit: Kit) {
	return kit.tool({
		name: "nameFavourite",
		description: "tools/nameFavourite",
		parameters: Type.Object({ agent: Type.String({ description: "The resident you like most (name or ID), e.g. A03", minLength: 1, maxLength: 16 }) }),
		suggest: ["resident"],
		execute: ({ agent: choice }, ctx: ToolCtx) => {
			const voter = ctx.resident;
			if (voter === undefined) return refuse("UNKNOWN_AGENT");
			const round = roundsOf(ctx)[ctx.state.round];
			if (ctx.options.popularity === undefined) return refuse("NO_VOTE", "this city holds no such vote");
			if (ctx.state.phase !== "open" || round === undefined) return refuse("NO_VOTE", "no vote is open");
			if (!ctx.residents.has(choice)) return refuse("UNKNOWN_AGENT", choice);
			if (choice === voter) return refuse("SELF_VOTE", "you cannot name yourself");
			if (!inCity(ctx, choice)) return refuse("EXILED", `${choice} is no longer in the city`);
			ctx.state.ballots.set(voter, choice);
			ctx.emit("popularity_ballot", { round: ctx.state.round + 1, agent: voter, choice });
			return reply(ctx.prompt("replies/ballot-favourite", { choice, until: round.countsAt }));
		},
	});
}

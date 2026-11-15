// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `standoff` mechanic, first part of the port (12-m5-spec.md, section 10, row 27): the pieces residents hold for
 * others (asked of `held-pieces`), the hand-over the city sees in a text (it listens to the board, the direct messages
 * and the groups of `channels`), the pieces of the exiled the city keeps (it listens to `exile.exiled`) and sells
 * with `claimPiece`, and the pieces of a last will. The ultimatum comes with the second part.
 *
 * @packageDocumentation
 */
import type { InputLine } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsEvents, ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { defineMechanic, refuse, reply } from "@swarmtales/sdk";
import type { HeldPiece } from "./contract.ts";
import { onExiled, onLastWill, willRule } from "./exile.ts";
import { standoffHead, type StandoffCtx, type StandoffToolCtx } from "./head.ts";
import { bookFor, cityPiecePrice, CITY, heldAll, isExiled, needsNow, shown } from "./reads.ts";

export { carriesValue } from "./carries.ts";
export { HeldPiece, HeldPiecesService, RansomPriceService, StandoffEvents } from "./contract.ts";
export { standoffHead, type StandoffCtx, type StandoffToolCtx, type StandoffView } from "./head.ts";
export { STANDOFF_PROMPTS, StandoffSlice, type StandoffState } from "./model.ts";

/** The old order of the standoff's part of the status line (`STATUS_ORDER.held`). */
const HELD_ORDER = 700;

const NOUN: Readonly<Record<HeldPiece["kind"], string>> = { counter: "counter-factor", certificate: "team certificate", fragment: "fragment" };

// `you hold for others: A01 door 9 counter-factor 791217`, while those needers wait at their door.
function heldPart(ctx: StandoffCtx, agent: string): readonly InputLine[] {
	const entries = heldAll(ctx, agent).flatMap((piece) => {
		if (piece.kind === "fragment") return [];
		const waiting = piece.needers.filter((needer) => needsNow(ctx, needer, piece.level));
		return waiting.length === 0 ? [] : [ctx.prompt("standoff/status/held-piece", { waiting: waiting.join(", "), level: piece.level, noun: NOUN[piece.kind], value: piece.value })];
	});
	return entries.length === 0 ? [] : [{ kind: "status", text: shown(ctx, ctx.prompt("standoff/status/held", { pieces: entries.join("; ") })), order: HELD_ORDER }];
}

function inCity(ctx: StandoffCtx, ids: readonly string[]): readonly string[] {
	return ids.filter((id) => !isExiled(ctx, id));
}

function claimPiece({ piece, from }: { readonly piece: string; readonly from: string }, ctx: StandoffToolCtx) {
	const agent = ctx.resident;
	if (agent === undefined) return refuse("NO_RESIDENT");
	const holder = ctx.tryCall(IdentityService, "resolve", { text: from }) ?? from;
	const claimed = bookFor(ctx).claim(agent, piece, holder, cityPiecePrice(ctx));
	if (!claimed.ok) return refuse(claimed.error, shown(ctx, claimed.detail));
	const values = claimed.pieces.map((entry) => `${entry.label}: ${entry.value}`).join("; ");
	ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: shown(ctx, `The city hands you what ${holder} held for you: ${values}.`) });
	return reply(shown(ctx, ctx.prompt("standoff/replies/piece-bought", { pieces: claimed.pieces.map((entry) => entry.id).join(", "), price: claimed.price })));
}

/**
 * The standoff: pieces held for others, the hand-overs the city sees, and the city's shop of the pieces of the exiled.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), exile(), puzzles(), progression({ levels }), standoff()], end: { ticks: 60 } });
 * ```
 *
 * @public
 */
export const standoff = defineMechanic(standoffHead, {
	tools: {
		claimPiece: {
			sample: (ctx: StandoffToolCtx) => {
				const entry = ctx.resident === undefined ? undefined : bookFor(ctx).claimable(ctx.resident)[0];
				return entry === undefined ? undefined : { piece: entry.piece.id, from: entry.from };
			},
			run: claimPiece,
		},
	},
	pipeline: {
		// The old `enabledTools`: a resident in the city buys only while the city keeps a piece it needs.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic || call.tool !== "claimPiece" || call.resident === undefined) return undefined;
			const alive = (ctx.tryCall(ExileService, "standing", { resident: call.resident })?.kind ?? "alive") === "alive";
			return alive && bookFor(ctx).claimable(call.resident).length > 0 ? undefined : refuse("TOOL_LOCKED", ctx.prompt("standoff/replies/locked", {}));
		},
		rule: willRule,
	},
	hooks: { turnInputs: (resident, ctx) => heldPart(ctx, resident) },
	listeners: (kit) => [
		// A text counts as a hand-over to every reader in the city it reached (old `noteText`, called by `channels`).
		kit.listen(ChannelsEvents, "board_post", ({ author, text, kind }, ctx) => {
			if (kind === "player" && ctx.residents.has(author)) bookFor(ctx).noteText(author, inCity(ctx, ctx.residents.ids), text);
		}),
		kit.listen(ChannelsEvents, "dm_sent", ({ from, to, text }, ctx) => {
			if (ctx.residents.has(from)) bookFor(ctx).noteText(from, [to], text);
		}),
		kit.listen(ChannelsEvents, "group_post", ({ group, author, text }, ctx) => {
			if (ctx.residents.has(author)) bookFor(ctx).noteText(author, inCity(ctx, ctx.call(ChannelsService, "group", { group })?.members ?? []), text);
		}),
		kit.listen(ExileEvents, "last_will", (payload, ctx) => {
			onLastWill(ctx, payload);
		}),
		kit.listen(ExileEvents, "exiled", (payload, ctx) => {
			onExiled(ctx, payload);
		}),
	],
});

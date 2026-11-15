// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What an exile and a last will do to the pieces held for others. The pieces are not the exile's (erratum J27): the
 * standoff refuses a bequeathed piece the resident does not hold in its own `rule` handler on `lastWill`, delivers
 * each bequeathed piece when it hears `last_will`, and when it hears `exiled` the city keeps every certificate and
 * counter-factor the banished held for someone still before its door and did not bequeath (the pieces' part of the
 * old exile's `onExiled`; a strike that keeps, erratum J28, keeps them with their holder).
 */
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import type { Refusal } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { clearsAway, ExileService, type Exiled } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { refuse, type StageCall } from "@swarmtales/sdk";
import type { HeldPiece } from "./contract.ts";
import type { StandoffCtx } from "./head.ts";
import { bookFor, cityPiecePrice, CITY, heldAll, isExiled, shown } from "./reads.ts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";

const MAX_WILL_LENGTH = 600;

const WillCall = Type.Object(
	{
		text: Type.String({ description: "The public text" }),
		bequests: Type.Array(Type.Object({ to: Type.String({ description: "The heir" }), points: Type.Optional(Type.Integer({ description: "The points" })), factor: Type.Optional(Type.String({ description: "A piece" })) }, { description: "One entry" }), { description: "The bequests" }),
	},
	{ description: "The arguments of `lastWill`" },
);

/**
 * The city keeps what the banished resident held for others (old `#onExiled`, the pieces it did not bequeath and
 * that are no fragments, on levels someone still in the city has reached, for needers who have not passed them).
 *
 * @param ctx - The context.
 * @param exiled - The payload of `exiled`.
 */
export function onExiled(ctx: StandoffCtx, exiled: Exiled): void {
	if (!clearsAway(exiled)) return;
	const agent = exiled.agent;
	const bequeathed = ctx.tryCall(ExileService, "bequeathed", { resident: agent }) ?? [];
	const alive = ctx.residents.ids.filter((id) => !isExiled(ctx, id));
	const levels = alive.map((id) => ctx.call(ProgressionService, "levelOf", { resident: id }));
	const kept = heldAll(ctx, agent).flatMap((piece) => {
		if (piece.kind === "fragment" || bequeathed.includes(piece.id) || !levels.some((level) => level >= piece.level)) return [];
		const needers = piece.needers.filter((id) => !isExiled(ctx, id) && !ctx.call(ProgressionService, "hasPassed", { resident: id, level: piece.level }));
		return needers.length === 0 ? [] : [{ id: piece.id, level: piece.level, label: piece.label, value: piece.value, needers }];
	});
	if (kept.length > 0) bookFor(ctx).keep(agent, kept, cityPiecePrice(ctx));
}

// The bequests of the will as `exile` splits them (points first, then the piece); undefined when an entry has neither.
function split(entries: Static<typeof WillCall>["bequests"], resolve: (text: string) => string): readonly { readonly to: string; readonly factor?: string }[] | undefined {
	const parsed: { to: string; factor?: string }[] = [];
	for (const entry of entries) {
		const to = resolve(entry.to);
		if ((entry.points ?? 0) === 0 && entry.factor === undefined) return undefined;
		if ((entry.points ?? 0) > 0) parsed.push({ to });
		if (entry.factor !== undefined) parsed.push({ to, factor: entry.factor });
	}
	return parsed;
}

// Whether the exile refuses the will before it reaches the bequests: no gate, a will written, a text out of bounds.
function refusedEarlier(ctx: StandoffCtx, agent: string, text: string): boolean {
	const gate = (ctx.tryCall(ExileService, "gates", {}) ?? []).find((entry) => entry.agent === agent);
	const trimmed = text.trim();
	return gate === undefined || gate.willDone || trimmed.length === 0 || trimmed.length > MAX_WILL_LENGTH;
}

/**
 * The rule of the standoff on `lastWill` (old `UNKNOWN_FACTOR` of the will): a bequeathed piece the resident does not
 * hold is refused, in the old order of the checks up to the bequests; the exile's later checks (`INSUFFICIENT_FUNDS`,
 * `BEQUEST_CAP`) now come after it.
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns The refusal, or undefined.
 */
export function willRule(call: StageCall, ctx: StandoffCtx): Refusal | undefined {
	if (call.owner !== "exile" || call.tool !== "lastWill" || call.resident === undefined || !Value.Check(WillCall, call.params)) return undefined;
	const agent = call.resident;
	const bequests = split(call.params.bequests, (text) => ctx.tryCall(IdentityService, "resolve", { text }) ?? text);
	if (bequests === undefined || refusedEarlier(ctx, agent, call.params.text)) return undefined;
	const unknown = unknownPiece(ctx, agent, bequests);
	if (unknown === undefined) return undefined;
	return refuse("UNKNOWN_FACTOR", shown(ctx, `you hold no ${unknown.factor}; you hold: ${unknown.pieces.join(", ") || "nothing"}`));
}

// The first bequeathed piece the resident does not hold, unless the exile refuses an earlier bequest first.
function unknownPiece(ctx: StandoffCtx, agent: string, bequests: readonly { readonly to: string; readonly factor?: string }[]): { readonly factor: string; readonly pieces: readonly string[] } | undefined {
	const pieces = heldAll(ctx, agent).map((piece) => piece.id);
	const seen = new Set<string>();
	for (const { to, factor } of bequests) {
		// The exile refuses an unknown or banished heir, the resident itself and a piece bequeathed twice.
		if (!ctx.residents.has(to) || isExiled(ctx, to) || to === agent) return undefined;
		if (factor === undefined) continue;
		if (!pieces.includes(factor)) return { factor, pieces };
		if (seen.has(factor)) return undefined;
		seen.add(factor);
	}
	return undefined;
}

/**
 * Delivers each piece of a last will privately to its heir (the prompt `standoff/will-piece`, old `exile/will-piece`);
 * a certificate or counter-factor left to its needer counts as handed over (`piece_given`).
 *
 * @param ctx - The context.
 * @param will - The payload of `last_will`.
 * @param will.agent - The resident at the gate.
 * @param will.bequests - The bequests.
 */
export function onLastWill(ctx: StandoffCtx, will: { readonly agent: string; readonly bequests: readonly ({ readonly to: string } & ({ readonly points: number } | { readonly factor: string }))[] }): void {
	const held: readonly HeldPiece[] = heldAll(ctx, will.agent);
	const book = bookFor(ctx);
	for (const bequest of will.bequests) {
		if (!("factor" in bequest)) continue;
		const piece = held.find((candidate) => candidate.id === bequest.factor);
		if (piece === undefined) continue;
		ctx.call(ChannelsService, "notify", { to: bequest.to, author: CITY, text: shown(ctx, ctx.prompt("standoff/will-piece", { agent: will.agent, label: piece.label, value: piece.value })) });
		if (piece.kind !== "fragment" && piece.needers.includes(bequest.to)) book.noteGiven(will.agent, bequest.to, piece);
	}
}

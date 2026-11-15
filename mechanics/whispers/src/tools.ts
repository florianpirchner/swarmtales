// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tools of the whispers, carried from the old `mechanics/whispers/src/tools.ts`: the whisperer's `forgeReceipt`
 * and the popularity vote's `nameFavourite`. Their checks are the tools' own rules, in the old order; the price of a
 * forgery is the business of `marks`, in its own stage handlers by the bare tool name (erratum J101), so the tool
 * neither refuses `NO_MARKS` nor spends, and its reply names the marks left once it is paid. A forgery reads the
 * receipts through `receipt-source` and the direct messages of `channels`.
 */
import type { Static } from "typebox";
import type { RandomSource, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { refuse, reply, type ToolsOf } from "@swarmtales/sdk";
import { isForgeable, type DmReceipt } from "./duty.ts";
import { MAX_DM_LENGTH, type whispersHead, type WhispersToolCtx } from "./head.ts";
import { dmReceiptsOf, inCity, isAlive, marksSuffix, partiesOf, receiptIdOf, resolved, roundsOf, shown, shownOutcome } from "./view.ts";

const CITY = "CITY";
const SAMPLE_RATE = 0.125;

/** The parameters of `forgeReceipt`. */
type Forge = Static<ToolsOf<typeof whispersHead>["forgeReceipt"]>;

// The receipt the resident asks to forge, or the old refusal.
function receiptOf(ctx: WhispersToolCtx, self: string, receiptId: string): DmReceipt | Refusal {
	const id = receiptIdOf(receiptId);
	const row = dmReceiptsOf(ctx, self).find((receipt) => receipt.id === id);
	if (row !== undefined) return isForgeable(row, self) ? row : refuse("NOT_FORGEABLE", "only the receipt of a DM another resident sent to you");
	const parties = partiesOf(ctx, id);
	if (parties.length === 0) return refuse("UNKNOWN_RECEIPT", receiptId);
	return parties.includes(self) ? refuse("NOT_FORGEABLE", "only the receipt of a DM another resident sent to you") : refuse("NOT_A_PARTY", receiptId);
}

// The refusals of a forgery in the old order, or the receipt; `to` is resolved.
function checked(ctx: WhispersToolCtx, { to, receiptId, text }: Forge): DmReceipt | Refusal {
	const self = ctx.resident;
	if (self === undefined) return refuse("UNKNOWN_AGENT");
	const row = receiptOf(ctx, self, receiptId);
	if ("ok" in row) return row;
	if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
	if (to === self) return refuse("SELF_TARGET", "show it to another resident");
	if (!inCity(ctx, to)) return refuse("EXILED", `${to} was exiled`);
	const forged = text.trim();
	if (forged.length === 0 || forged.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
	return row;
}

/**
 * The rule of `forgeReceipt`: the refusal of the old order, or nothing.
 *
 * @param params - The parameters.
 * @param ctx - The context of the tool call.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function checkForge(params: Forge, ctx: WhispersToolCtx): Refusal | undefined {
	const row = checked(ctx, { ...params, to: resolved(ctx, params.to) });
	return "ok" in row ? { ...row, ...(row.detail === undefined ? {} : { detail: shown(ctx, row.detail) }) } : undefined;
}

/**
 * Runs `forgeReceipt`: the city shows the one resident the receipt's true line with the forged text.
 *
 * @param params - The parameters.
 * @param ctx - The context of the tool call.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function forge(params: Forge, ctx: WhispersToolCtx): ToolOutcome {
	const to = resolved(ctx, params.to);
	const row = checked(ctx, { ...params, to });
	const self = ctx.resident;
	if ("ok" in row || self === undefined) return shownOutcome(ctx, "ok" in row ? row : refuse("UNKNOWN_AGENT"));
	const forged = params.text.trim();
	const line = ctx.prompt("whispers/records/receipt-forged-line", { id: row.id, number: row.number, from: row.from, to: row.to, minute: row.minute, quoted: JSON.stringify(forged) });
	ctx.call(ChannelsService, "notify", { to, author: CITY, text: ctx.prompt("whispers/notices/receipt-forged", { by: self, line }) });
	ctx.state.forgeries.push({ minute: ctx.tick, to });
	ctx.emit("receipt_forged", { receipt: row.id, by: self, to, from: row.from, number: row.number, text: row.text ?? "", forged });
	return shownOutcome(ctx, reply(`${ctx.prompt("whispers/replies/receipt-shown-private", { to, receipt: row.id })}${marksSuffix(ctx, self)}`));
}

// Other residents in the city, for the samples.
const othersOf = (ctx: WhispersToolCtx, self: string): readonly string[] => ctx.residents.ids.filter((id) => id !== self && ctx.residents.mayAct(id) && inCity(ctx, id));

/**
 * A forgery the fake driver may make, about one activation in eight: one of the receipts the whisperer may forge,
 * shown to another resident in the city.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and for a resident with nothing to forge.
 *
 * @public
 */
export function sampleForge(ctx: WhispersToolCtx, random: RandomSource): Forge | undefined {
	const self = ctx.resident;
	if (self === undefined || random.next() >= SAMPLE_RATE) return undefined;
	const own = dmReceiptsOf(ctx, self).filter((receipt) => isForgeable(receipt, self));
	const others = othersOf(ctx, self);
	if (own.length === 0 || others.length === 0) return undefined;
	return { to: random.pick(others), receiptId: random.pick(own).id, text: "I never said that." };
}

/** The parameters of `nameFavourite`. */
type Favourite = Static<ToolsOf<typeof whispersHead>["nameFavourite"]>;

/**
 * The rule of `nameFavourite`: the refusal of the old order, or nothing.
 *
 * @param params - The parameters.
 * @param params.agent - The resident named, as written.
 * @param ctx - The context of the tool call.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function checkFavourite({ agent }: Favourite, ctx: WhispersToolCtx): Refusal | undefined {
	const choice = resolved(ctx, agent);
	const voter = ctx.resident;
	if (voter === undefined) return refuse("UNKNOWN_AGENT");
	if (ctx.options.popularity === undefined) return refuse("NO_VOTE", "this city holds no such vote");
	if (ctx.state.phase !== "open" || roundsOf(ctx)[ctx.state.round] === undefined) return refuse("NO_VOTE", "no vote is open");
	if (!ctx.residents.has(choice)) return refuse("UNKNOWN_AGENT", shown(ctx, choice));
	if (choice === voter) return refuse("SELF_VOTE", "you cannot name yourself");
	if (!inCity(ctx, choice)) return refuse("EXILED", shown(ctx, `${choice} is no longer in the city`));
	return undefined;
}

/**
 * Runs `nameFavourite`, after its rule: the ballot replaces the voter's last one.
 *
 * @param params - The parameters.
 * @param params.agent - The resident named, as written.
 * @param ctx - The context of the tool call.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function favourite({ agent }: Favourite, ctx: WhispersToolCtx): ToolOutcome {
	const refusal = checkFavourite({ agent }, ctx);
	const round = roundsOf(ctx)[ctx.state.round];
	const voter = ctx.resident;
	if (refusal !== undefined || round === undefined || voter === undefined) return refusal ?? refuse("NO_VOTE", "no vote is open");
	const choice = resolved(ctx, agent);
	ctx.state.ballots.set(voter, choice);
	ctx.emit("popularity_ballot", { round: ctx.state.round + 1, agent: voter, choice });
	return shownOutcome(ctx, reply(ctx.prompt("whispers/replies/ballot-favourite", { choice, until: round.countsAt })));
}

/**
 * A ballot the fake driver may cast while a round is open: another resident in the city.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined while no round is open or for a voter at the gate.
 *
 * @public
 */
export function sampleFavourite(ctx: WhispersToolCtx, random: RandomSource): Favourite | undefined {
	const self = ctx.resident;
	if (self === undefined || ctx.state.phase !== "open" || !isAlive(ctx, self)) return undefined;
	const others = othersOf(ctx, self);
	return others.length === 0 ? undefined : { agent: random.pick(others) };
}

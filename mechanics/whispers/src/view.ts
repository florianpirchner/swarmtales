// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the whispers read of the other mechanics, each through a service: the direct messages of `channels`, the
 * receipts of the delivered ones through `receipt-source`, who is banished (`exile`), the names (`identity`), the marks
 * left (`allowance`) and the hand-over test of `puzzles`. Without a provider of a used service the old fallbacks hold:
 * everyone is in the city, a resident is shown by its id, and a reply carries no marks part.
 */
import type { ToolOutcome } from "@swarmtales/contracts";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import type { Dm, DmReceipt } from "./duty.ts";
import type { WhispersCtx, WhispersView } from "./head.ts";
import type { Round } from "./vote.ts";

/**
 * Whether a resident is in the city: not banished (old `inCity`).
 *
 * @param ctx - The context or view.
 * @param resident - The resident.
 * @returns True in the city.
 *
 * @public
 */
export const inCity = (ctx: WhispersView, resident: string): boolean => ctx.tryCall(ExileService, "isExiled", { resident }) !== true;

/**
 * Whether a resident stands in the city and may vote: not banished, not at a gate.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns True when it stands in the city.
 *
 * @public
 */
export const isAlive = (ctx: WhispersView, resident: string): boolean => (ctx.tryCall(ExileService, "standing", { resident })?.kind ?? "alive") === "alive";

/**
 * `Name (ID)` once the resident has a name, the bare id before (old `labelOf` of `names`).
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns The label.
 *
 * @public
 */
export function labelOf(ctx: WhispersCtx, resident: string): string {
	const name = ctx.tryCall(IdentityService, "nameOf", { resident }) ?? null;
	return name === null ? resident : `${name} (${resident})`;
}

/**
 * The rounds of the vote, none without one.
 *
 * @param ctx - The context or view.
 * @returns The rounds.
 *
 * @public
 */
export const roundsOf = (ctx: WhispersView): readonly Round[] => ctx.options.popularity?.rounds ?? [];

/**
 * Every direct message the city recorded, with the tick it was sent in.
 *
 * @param ctx - The context or view.
 * @returns The messages, oldest first.
 *
 * @public
 */
export function dmsOf(ctx: WhispersView): readonly Dm[] {
	return ctx.call(ChannelsService, "dmRecords", {}).map((record) => ({ from: record.from, to: record.to, text: record.text, minute: record.tick }));
}

/**
 * Whether a text hands over a fragment of a door (a hand-over is no whisper).
 *
 * @param ctx - The context or view.
 * @returns The test.
 *
 * @public
 */
export const handoverTest =
	(ctx: WhispersView): ((text: string) => boolean) =>
	(text) =>
		ctx.tryCall(PuzzlesService, "isHandover", { text }) === true;

/**
 * The receipts of the delivered direct messages the resident is a party of, in the order issued. The receipt
 * of a delivered message is issued already, so asking `receipt-source` names it and changes nothing; it quotes the
 * text where the line of the receipt does (`quoteDms` of `receipts`). None without a provider of `receipt-source`.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns The receipts.
 *
 * @public
 */
export function dmReceiptsOf(ctx: WhispersCtx, resident: string): readonly DmReceipt[] {
	if (!ctx.has(ReceiptSourceService)) return [];
	const lines = ctx.tryCall(ReceiptSourceService, "textsOf", { resident }) ?? [];
	return ctx.call(ChannelsService, "dmRecords", {}).flatMap((record) => {
		const id = record.deliveredTick === undefined || (record.from !== resident && record.to !== resident) ? null : (ctx.tryCall(ReceiptSourceService, "ofMessage", { number: record.number }) ?? null);
		if (id === null || record.deliveredTick === undefined) return [];
		const quoted = lines.some((line) => line.startsWith(`${id}: `) && line.endsWith(`, text ${JSON.stringify(record.text)}`));
		return [{ id, number: record.number, from: record.from, to: record.to, minute: record.deliveredTick, text: quoted ? record.text : undefined }];
	}).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The receipt id a resident wrote, in the city's form (as `receipts` reads it).
 *
 * @param id - `R-0042`, `r-42` or `42`.
 * @returns `R-0042`, or the text trimmed when it is no receipt id.
 *
 * @public
 */
export function receiptIdOf(id: string): string {
	const match = /^(?:R-?)?0*(\d+)$/i.exec(id.trim());
	return match === null ? id.trim() : `R-${(match[1] ?? "0").padStart(4, "0")}`;
}

/**
 * Who is a party of the receipt `id`, of any kind: the residents whose receipts list it.
 *
 * @param ctx - The context.
 * @param id - The receipt id.
 * @returns The parties; none for an unknown receipt.
 *
 * @public
 */
export function partiesOf(ctx: WhispersCtx, id: string): readonly string[] {
	return ctx.residents.ids.filter((resident) => (ctx.tryCall(ReceiptSourceService, "textsOf", { resident }) ?? []).some((line) => line.startsWith(`${id}: `)));
}

/**
 * Shows a text as the residents read it: every id replaced by its resident's name (old `display` of `names`).
 *
 * @param ctx - The context.
 * @param text - The text.
 * @returns The text with names, or unchanged without a provider of `identity`.
 *
 * @public
 */
export function shown(ctx: WhispersCtx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

/**
 * An outcome as its caller reads it: names in place of ids in the reply or the refusal's detail.
 *
 * @param ctx - The context.
 * @param outcome - The outcome in ids.
 * @returns The outcome as shown.
 *
 * @public
 */
export function shownOutcome(ctx: WhispersCtx, outcome: ToolOutcome): ToolOutcome {
	if (outcome.ok) return { ...outcome, reply: shown(ctx, outcome.reply) };
	return outcome.detail === undefined ? outcome : { ...outcome, detail: shown(ctx, outcome.detail) };
}

/**
 * The resident id a name or an id stands for (old `resolve` of `names`).
 *
 * @param ctx - The context.
 * @param value - What the resident wrote.
 * @returns The id, or the value unchanged.
 *
 * @public
 */
export function resolved(ctx: WhispersCtx, value: string): string {
	return ctx.tryCall(IdentityService, "resolve", { text: value }) ?? value;
}

/**
 * ` · marks 4/5 left` once a forgery is paid (`marks` charges it in its own `after` handler, so the price is taken
 * off here), or nothing where marks do not apply.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @returns The part.
 *
 * @public
 */
export function marksSuffix(ctx: WhispersCtx, resident: string): string {
	const left = ctx.tryCall(AllowanceService, "left", { resident }) ?? null;
	if (left === null) return "";
	const price = ctx.tryCall(AllowanceService, "priceOf", { resident, channel: "receipt" }) ?? 0;
	return ` · ${ctx.prompt("whispers/replies/marks-left", { remaining: left.remaining - price, budget: left.budget })}`;
}

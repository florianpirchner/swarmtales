/**
 * What the whispers mechanic reads of the other mechanics, each through their API (the DMs of
 * channels, the receipts, the exile, the names, the hand-over test of puzzles).
 */
import { ChannelsApi, ExileApi, MarksApi, NamesApi, PuzzlesApi, ReceiptsApi, type Receipt } from "@swarmtales/mechanic-shared";
import type { Dm, DmReceipt } from "./duty.ts";
import type { Ctx } from "./head.ts";
import type { Round } from "./vote.ts";

/** Whether a resident is in the city: not exiled (old `inCity`, world.ts:701, 716, 1070). */
export const inCity = (ctx: Ctx, resident: string): boolean => ctx.tryCall(ExileApi, "isExiled", { resident }) !== true;

/** Whether a resident stands in the city and may vote: alive, not at a gate (old `standingOf(agent).kind === "alive"`). */
export const isAlive = (ctx: Ctx, resident: string): boolean => (ctx.tryCall(ExileApi, "standing", { resident })?.kind ?? "alive") === "alive";

export const labelOf = (ctx: Ctx, resident: string): string => ctx.tryCall(NamesApi, "labelOf", { resident }) ?? resident;

export const roundsOf = (ctx: Ctx): readonly Round[] => ctx.options.popularity?.rounds ?? [];

/** Every DM the city recorded, with the minute it was sent. */
export function dmsOf(ctx: Ctx): readonly Dm[] {
	return (ctx.call(ChannelsApi, "dmRecords", {})).map((record) => ({ from: record.from, to: record.to, text: record.text, minute: record.minute }));
}

/** Whether a DM text hands over a fragment of a door (a hand-over is no whisper). */
export const handoverTest = (ctx: Ctx): ((text: string) => boolean) => (text) => ctx.tryCall(PuzzlesApi, "isHandover", { text }) === true;

/** A receipt as a forgeable DM receipt, or undefined for any other kind. */
export function dmReceiptOf(receipt: Receipt): DmReceipt | undefined {
	return receipt.body.kind === "dm" ? { id: receipt.id, number: receipt.body.number, from: receipt.body.from, to: receipt.body.to, minute: receipt.minute, text: receipt.body.text } : undefined;
}

/** The DM receipts a resident is a party of, in issue order. */
export function dmReceiptsOf(ctx: Ctx, resident: string): readonly DmReceipt[] {
	return (ctx.call(ReceiptsApi, "list", { resident })).flatMap((receipt) => {
		const found = dmReceiptOf(receipt);
		return found === undefined ? [] : [found];
	});
}

/** ` · marks 4/5 left` after a reply, or nothing where marks do not apply. */
export function marksSuffix(ctx: Ctx, resident: string): string {
	const left = ctx.call(MarksApi, "left", { resident });
	return left === null ? "" : ` · ${ctx.prompt("replies/marks-left", { remaining: left.remaining, budget: left.budget })}`;
}

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the fake driver (`--fake`) may call of `blame`: a pair the city could check, read from the receipt book alone.
 * The caller's delivered DM to another resident, and a DM of that resident back to the caller delivered after it, a
 * pair not blamed yet. Without such a pair the sample gives nothing and draws nothing, so a run in which no DM was
 * answered plays as before. Whether the accused denied the DM is the judge's; a run without one refuses the call
 * (`JUDGE_ABSENT`). No sample changes state.
 */
import type { RandomSource } from "@swarmtales/contracts";
import type { Receipt } from "./book.ts";
import type { ReceiptsToolCtx } from "./head.ts";

/** The share of the times the sample is asked in which it gives a call. */
const RATE = 0.125;

type DmReceipt = Extract<Receipt, { readonly kind: "dm" }>;

const isDm = (receipt: Receipt): receipt is DmReceipt => receipt.kind === "dm";

/**
 * A blame of a DM the caller sent and the accused's later DM back to it.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time, for a caller that is no resident and when the book holds no
 *   such pair.
 */
export function sampleBlame(ctx: ReceiptsToolCtx, random: RandomSource): { dm: number; accused: string; claim: number } | undefined {
	const self = ctx.resident;
	if (self === undefined) return undefined;
	const dms = ctx.state.receipts.filter(isDm);
	const blamed = (dm: number, claim: number): boolean => ctx.state.pairs.some((pair) => pair.dm === dm && pair.claim === claim);
	const pairs = dms.flatMap((sent, index) =>
		sent.from !== self || sent.to === self
			? []
			: dms.slice(index + 1).filter((back) => back.from === sent.to && back.to === self && !blamed(sent.number, back.number)).map((back) => ({ dm: sent.number, accused: sent.to, claim: back.number })),
	);
	return pairs.length === 0 || random.next() >= RATE ? undefined : random.pick(pairs);
}

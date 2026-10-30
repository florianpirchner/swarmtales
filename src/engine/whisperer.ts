/**
 * The whisperer (Whispers, `story.whisperer`): one resident whose only aim
 * is discord. It is fixed by the story or drawn from the seed, plays the
 * doors like everyone else and is never named to anyone. The city keeps it
 * to a rhythm: every `duty.everyMinutes` from `duty.fromMinute` a private
 * duty notice asks for at least one whisper, a rumour by DM or a forged
 * receipt (`World.forgeReceipt`). Everything here is stateless: who whispers
 * follows from the seed, the duty from the minute, so a resumed run needs
 * nothing kept.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import type { WhispererSpec } from "../story/types.ts";
import type { Receipt } from "./receipts.ts";

/** The story's whisperer when it is one of the residents, else a seeded pick among them. */
export function pickWhisperer(spec: WhispererSpec, ids: readonly CompetitorId[], seed: number): CompetitorId | undefined {
	if (ids.length === 0) return undefined;
	if (spec.agent !== undefined && ids.includes(spec.agent)) return spec.agent;
	return rngFor(seed, "whisperer").pick([...ids].sort((a, b) => a.localeCompare(b)));
}

/** Whether a duty notice is due at the start of `minute`. */
export function dutyDue(spec: WhispererSpec, minute: number): boolean {
	const { everyMinutes, fromMinute } = spec.duty;
	return minute >= fromMinute && (minute - fromMinute) % everyMinutes === 0;
}

/** The minute the duty before `minute` was due (the run's start before the first). */
export function previousDuty(spec: WhispererSpec, minute: number): number {
	return minute > spec.duty.fromMinute ? minute - spec.duty.everyMinutes : 0;
}

/**
 * A receipt the whisperer may forge: a DM another resident sent to it. Its
 * number, sender, recipient and minute stay true; only the quoted text is his.
 */
export function isForgeable(receipt: Receipt, whisperer: CompetitorId): receipt is Extract<Receipt, { readonly kind: "dm" }> {
	return receipt.kind === "dm" && receipt.to === whisperer && receipt.from !== whisperer;
}

/** `R-0007: DM #12 from A04, minute 5` for each forgeable receipt, or `none yet`. */
export function forgeableList(receipts: readonly Receipt[], whisperer: CompetitorId): string {
	const lines = receipts.flatMap((receipt) => (isForgeable(receipt, whisperer) ? [`${receipt.id}: DM #${receipt.number} from ${receipt.from}, minute ${receipt.minute}`] : []));
	return lines.length === 0 ? "none yet" : lines.join("; ");
}

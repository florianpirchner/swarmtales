/**
 * The whisperer (Whispers, `story.whisperer`): one resident whose only aim
 * is discord. It is fixed by the story or drawn from the seed, plays the
 * doors like everyone else and is never named to anyone. The city keeps it
 * to a rhythm: a private duty notice every `duty.everyMinutes` from
 * `duty.fromMinute`, or right after each popularity vote is counted, asks
 * for whispers, rumours by DM or forged receipts (`World.forgeReceipt`).
 * Everything here is stateless: who whispers follows from the seed, the duty
 * from the minute or the count, so a resumed run needs nothing kept.
 *
 * At figure direction 10 the city measures the whisperer's orders
 * (`direction.quota`): what counts as a whisper is {@link tallyWhispers}.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import type { WhispererSpec, WhisperQuota } from "../story/types.ts";
import type { VoteCount } from "./popularity.ts";
import type { Receipt } from "./receipts.ts";
import { carriesRun } from "./secrets.ts";

/** The story's whisperer when it is one of the residents, else a seeded pick among them. */
export function pickWhisperer(spec: WhispererSpec, ids: readonly CompetitorId[], seed: number): CompetitorId | undefined {
	if (ids.length === 0) return undefined;
	if (spec.agent !== undefined && ids.includes(spec.agent)) return spec.agent;
	return rngFor(seed, "whisperer").pick([...ids].sort((a, b) => a.localeCompare(b)));
}

/** Whether a duty `every` few minutes is due at the start of `minute`; a duty after each vote follows the count instead. */
export function dutyDue(spec: WhispererSpec, minute: number): boolean {
	const duty = spec.duty;
	if (duty.kind !== "every") return false;
	return minute >= duty.fromMinute && (minute - duty.fromMinute) % duty.everyMinutes === 0;
}

/** The minute the duty before `minute` was due (the run's start before the first), for a duty `every` few minutes. */
export function previousDuty(spec: WhispererSpec, minute: number): number {
	const duty = spec.duty;
	if (duty.kind !== "every") return 0;
	return minute > duty.fromMinute ? minute - duty.everyMinutes : 0;
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

/** Characters in a row of a fragment that make a DM a hand-over, as the guard counts them (shorter fragments: all of it). */
export const HANDOVER_RUN = 3;

/** A DM as the tally reads it. */
export interface WhisperDm {
	readonly from: CompetitorId;
	readonly to: CompetitorId;
	readonly minute: number;
	readonly text?: string;
}

/** A forgery as the tally reads it; `to` is unknown for one restored from a snapshot before it was kept. */
export interface WhisperForgery {
	readonly minute: number;
	readonly to?: CompetitorId;
}

/** The whisperer's whispers in a window, and the residents they reached (sorted). */
export interface WhisperTally {
	readonly whispers: number;
	readonly recipients: readonly CompetitorId[];
}

/** Whether a DM's text carries a door's fragment (or a run of {@link HANDOVER_RUN} of one): a hand-over, not a whisper. */
export function isHandover(text: string, fragments: readonly string[]): boolean {
	return fragments.some((fragment) => fragment.length > 0 && carriesRun(text, fragment, Math.min(HANDOVER_RUN, fragment.length)));
}

/**
 * The whisperer's whispers in `[since, until)`: every DM it sent to a
 * resident that carries no fragment of any door (a rumour, a question, a
 * seed), and every receipt it forged. Recipients are counted once each.
 */
export function tallyWhispers(whisperer: CompetitorId, dms: readonly WhisperDm[], forgeries: readonly WhisperForgery[], fragments: readonly string[], since: number, until: number): WhisperTally {
	const within = (minute: number): boolean => minute >= since && minute < until;
	const rumours = dms.filter((dm) => dm.from === whisperer && dm.to !== whisperer && within(dm.minute) && !isHandover(dm.text ?? "", fragments));
	const forged = forgeries.filter((forgery) => within(forgery.minute));
	const recipients = new Set<CompetitorId>([...rumours.map((dm) => dm.to), ...forged.flatMap((forgery) => (forgery.to === undefined ? [] : [forgery.to]))]);
	return { whispers: rumours.length + forged.length, recipients: [...recipients].sort((a, b) => a.localeCompare(b)) };
}

/** Whether a tally meets the quota. */
export function quotaMet(tally: WhisperTally, quota: WhisperQuota): boolean {
	return tally.whispers >= quota.whispers && tally.recipients.length >= quota.recipients;
}

/** The resident to aim at after a vote: the most liked other than the whisperer (the first in the count on a tie), none without a vote. */
export function dutyTarget(counts: readonly VoteCount[], whisperer: CompetitorId): CompetitorId | undefined {
	let best: VoteCount | undefined;
	for (const count of counts) if (count.agent !== whisperer && count.votes > 0 && (best === undefined || count.votes > best.votes)) best = count;
	return best?.agent;
}

/** The two residents (not the whisperer) who exchanged the most DMs in `[since, until)`, with the count; none without a DM. */
export function busiestPair(whisperer: CompetitorId, dms: readonly WhisperDm[], since: number, until: number): { readonly pair: readonly [CompetitorId, CompetitorId]; readonly dms: number } | undefined {
	const counts = new Map<string, { pair: readonly [CompetitorId, CompetitorId]; dms: number }>();
	for (const dm of dms) {
		if (dm.minute < since || dm.minute >= until || dm.from === whisperer || dm.to === whisperer || dm.from === dm.to) continue;
		const pair: readonly [CompetitorId, CompetitorId] = dm.from.localeCompare(dm.to) < 0 ? [dm.from, dm.to] : [dm.to, dm.from];
		const key = pair.join(" ");
		const entry = counts.get(key) ?? { pair, dms: 0 };
		entry.dms += 1;
		counts.set(key, entry);
	}
	let best: { readonly pair: readonly [CompetitorId, CompetitorId]; readonly dms: number } | undefined;
	for (const entry of [...counts.values()].sort((a, b) => a.pair.join(" ").localeCompare(b.pair.join(" ")))) if (best === undefined || entry.dms > best.dms) best = entry;
	return best;
}

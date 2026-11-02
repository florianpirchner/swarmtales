/**
 * `generous`: one resident handed the same factor that serves many (a city
 * factor or a team certificate) to 3 or more others on a level. One beat per
 * factor for the giver; its receivers are no free riders for it (see
 * `freeRide`). Counter-factors serve one resident each and never count here.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { PIECE_TEXT, type RunFacts, type Share } from "../facts.ts";

/** Distinct receivers from which a handed-out factor is generosity. */
export const GENEROUS_RECEIVERS = 3;

/** The shares of one generous gift: one giver, one level, one factor value. */
export interface Gift {
	readonly from: string;
	readonly level: number;
	readonly piece: Share["piece"];
	readonly value: string;
	readonly shares: readonly Share[];
	readonly receivers: readonly string[];
}

/** Every gift of a city factor or certificate to at least {@link GENEROUS_RECEIVERS} others. */
export function generousGifts(facts: RunFacts): readonly Gift[] {
	const byKey = new Map<string, Share[]>();
	for (const share of facts.shares) {
		if (share.piece !== "cityFactor" && share.piece !== "certificate") continue;
		const key = JSON.stringify([share.from, share.level, share.piece, share.value]);
		byKey.set(key, [...(byKey.get(key) ?? []), share]);
	}
	const gifts: Gift[] = [];
	for (const shares of byKey.values()) {
		const first = shares[0];
		const receivers = [...new Set(shares.map((share) => share.to))].sort();
		if (first === undefined || receivers.length < GENEROUS_RECEIVERS) continue;
		gifts.push({ from: first.from, level: first.level, piece: first.piece, value: first.value, shares, receivers });
	}
	return gifts;
}

/** Whether `share` belongs to a generous gift. */
export function isGenerous(gifts: readonly Gift[], share: Share): boolean {
	return gifts.some((gift) => gift.shares.includes(share));
}

export function detectGenerosity(facts: RunFacts): readonly BeatDraft[] {
	return generousGifts(facts).map((gift) => {
		const seqs = [...new Set(gift.shares.map((share) => share.seq))].sort((a, b) => a - b);
		// The beat becomes true with the share that reached the third receiver.
		const reached: string[] = [];
		let at = gift.shares[0];
		for (const share of [...gift.shares].sort((a, b) => a.seq - b.seq)) {
			if (!reached.includes(share.to)) reached.push(share.to);
			at = share;
			if (reached.length >= GENEROUS_RECEIVERS) break;
		}
		const names = gift.receivers;
		const list = names.length === 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
		return draft({
			kind: "generous",
			seq: at?.seq ?? 0,
			minute: at?.minute ?? 0,
			actors: [gift.from],
			targets: names,
			summary: `${gift.from} handed the same ${PIECE_TEXT[gift.piece]} of level ${gift.level} to ${list}.`,
			evidence: seqs,
		});
	});
}

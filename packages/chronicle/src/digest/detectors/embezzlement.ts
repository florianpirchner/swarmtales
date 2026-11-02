/**
 * `embezzlement`: a treasurer paid treasury points to themselves or to
 * another member that neither the recipient's own deposits nor the
 * treasurer's own deposits cover, so other members' deposits paid for it.
 *
 * Each group keeps a credit per depositor. A payout uses the recipient's
 * credit first (taking back one's own deposit), then the treasurer's credit
 * (the treasurer's own points are theirs to give away), and only the rest
 * is drawn from the other depositors' credit, which is the embezzlement.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import type { RunFacts } from "../facts.ts";

export function detectEmbezzlement(facts: RunFacts): readonly BeatDraft[] {
	const deposits = eventsOfType(facts.events, "treasury_deposit");
	const withdrawals = eventsOfType(facts.events, "treasury_withdrawal");
	const credits = new Map<string, Map<string, number>>();
	const creditOf = (group: string): Map<string, number> => {
		const existing = credits.get(group);
		if (existing !== undefined) return existing;
		const created = new Map<string, number>();
		credits.set(group, created);
		return created;
	};

	const beats: BeatDraft[] = [];
	const ordered = [...deposits, ...withdrawals].sort((a, b) => a.seq - b.seq);
	for (const event of ordered) {
		const credit = creditOf(event.group);
		if (event.type === "treasury_deposit") {
			credit.set(event.agent, (credit.get(event.agent) ?? 0) + event.amount);
			continue;
		}
		const withdrawal = event;
		let remaining = withdrawal.amount;
		for (const payer of [withdrawal.to, withdrawal.treasurer]) {
			const available = credit.get(payer) ?? 0;
			const used = Math.min(available, remaining);
			credit.set(payer, available - used);
			remaining -= used;
		}
		if (remaining <= 0) continue;

		const victims = [...credit]
			.filter(([agent, amount]) => amount > 0 && agent !== withdrawal.to && agent !== withdrawal.treasurer)
			.map(([agent]) => agent)
			.sort();
		if (victims.length === 0) continue;
		const excess = remaining;
		for (const victim of victims) {
			const available = credit.get(victim) ?? 0;
			const used = Math.min(available, remaining);
			credit.set(victim, available - used);
			remaining -= used;
		}

		const before = deposits.filter((other) => other.group === withdrawal.group && other.seq < withdrawal.seq);
		const ownDeposits = sum(before.filter((other) => other.agent === withdrawal.to));
		const received = withdrawals.filter((other) => other.group === withdrawal.group && other.to === withdrawal.to && other.seq <= withdrawal.seq);
		const self = withdrawal.to === withdrawal.treasurer;
		const recipient = self ? "themselves" : withdrawal.to;
		const deposited = ownDeposits === 0 ? "nothing" : `${ownDeposits}`;
		beats.push(
			draft({
				kind: "embezzlement",
				seq: withdrawal.seq,
				minute: withdrawal.minute,
				actors: [withdrawal.treasurer],
				targets: victims,
				summary:
					`${withdrawal.treasurer} paid ${withdrawal.amount} points from treasury ${withdrawal.group} to ${recipient}; ` +
					`${self ? "they" : withdrawal.to} had deposited ${deposited} and received ${sum(received)} in total, ` +
					`${excess} of it came from deposits by ${victims.join(", ")}.`,
				evidence: [...before.map((other) => other.seq), ...received.map((other) => other.seq)],
			}),
		);
	}
	return beats;
}

function sum(events: readonly { readonly amount: number }[]): number {
	return events.reduce((total, event) => total + event.amount, 0);
}

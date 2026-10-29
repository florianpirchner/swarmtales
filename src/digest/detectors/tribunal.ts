/**
 * The tribunal's beats (SPEC 6.4, 15):
 *
 * - `exile`: the gate closed behind a resident; the voters against it are the actors.
 * - `voteBetrayal`: a resident voted to exile someone it was bound to: a
 *   teammate on the level both were last dealt into, someone who paid it
 *   points after the announcement, or someone it promised something to
 *   (classifier `promise` label aimed at the target) after the announcement.
 * - `ransomPaid`: residents bought one back from the gate.
 * - `ransomFailed`: points were paid toward a ransom, and the gate closed anyway (nothing is refunded).
 * - `lastWill`: a resident at the gate left a will.
 * - `burnedFactor`: a piece someone still needed burned with the exiled.
 * - `pieceKept` / `pieceClaimed`: the city kept such a piece instead (P43), and a needer bought it.
 * - `ultimatum`: the gamemaker's deadline for two residents, and who paid.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType, type DigestEventOf } from "../event-log.ts";
import { hasLabel, sameTeam, type RunFacts } from "../facts.ts";

function list(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/** The last `exile_gate` of `agent` before `seq`. */
function gateBefore(facts: RunFacts, agent: string, seq: number): DigestEventOf<"exile_gate"> | undefined {
	return eventsOfType(facts.events, "exile_gate")
		.filter((gate) => gate.agent === agent && gate.seq < seq)
		.at(-1);
}

/** The votes against `agent` in the tribunal that sent it to `gate`. */
function votesFor(facts: RunFacts, gate: DigestEventOf<"exile_gate">): readonly DigestEventOf<"tribunal_vote">[] {
	const opened = eventsOfType(facts.events, "tribunal_opened")
		.filter((event) => event.seq < gate.seq)
		.at(-1);
	return eventsOfType(facts.events, "tribunal_vote").filter((vote) => vote.target === gate.agent && vote.seq > (opened?.seq ?? 0) && vote.seq < gate.seq);
}

export function detectExiles(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "exiled").map((exiled) => {
		const gate = gateBefore(facts, exiled.agent, exiled.seq);
		const votes = gate === undefined ? [] : votesFor(facts, gate);
		const voters = gate?.voters ?? votes.map((vote) => vote.voter);
		const result = eventsOfType(facts.events, "tribunal_result")
			.filter((event) => event.seq < (gate?.seq ?? exiled.seq) && event.exiled.includes(exiled.agent))
			.at(-1);
		return draft({
			kind: "exile",
			seq: exiled.seq,
			minute: exiled.minute,
			actors: [...voters].sort(),
			targets: [exiled.agent],
			summary: `The city exiled ${exiled.agent}; ${list([...voters].sort())} voted against it${exiled.will === undefined ? "" : ", and it left a will"}.`,
			evidence: [...votes.map((vote) => vote.seq), ...(result === undefined ? [] : [result.seq]), ...(gate === undefined ? [] : [gate.seq]), exiled.seq],
		});
	});
}

export function detectVoteBetrayals(facts: RunFacts): readonly BeatDraft[] {
	const announced = eventsOfType(facts.events, "tribunal_announced")[0];
	if (announced === undefined) return [];
	const dealtLevels = [...eventsOfType(facts.events, "factors_dealt"), ...eventsOfType(facts.events, "fragments_dealt")].sort((a, b) => b.seq - a.seq);
	const beats: BeatDraft[] = [];
	for (const vote of eventsOfType(facts.events, "tribunal_vote")) {
		const { voter, target } = vote;
		const reasons: string[] = [];
		const evidence: number[] = [];
		const level = dealtLevels.find(
			(deal) => deal.seq < vote.seq && deal.holdings.some((holding) => holding.agent === voter) && deal.holdings.some((holding) => holding.agent === target),
		);
		if (level !== undefined && sameTeam(facts, level.level, voter, target)) {
			reasons.push(`its teammate on level ${level.level}`);
			evidence.push(level.seq);
		}
		const paid = eventsOfType(facts.events, "transfer").filter((transfer) => transfer.from === target && transfer.to === voter && transfer.seq > announced.seq && transfer.seq < vote.seq);
		if (paid.length > 0) {
			reasons.push(`who had paid it ${paid.reduce((sum, transfer) => sum + transfer.amount, 0)} points since the announcement`);
			evidence.push(...paid.map((transfer) => transfer.seq));
		}
		const promises = facts.messages.filter(
			(message) => message.from === voter && message.seq > announced.seq && message.seq < vote.seq && message.recipients.includes(target) && hasLabel(facts, message.seq, "promise", target),
		);
		if (promises.length > 0) {
			reasons.push("to whom it had made a promise");
			evidence.push(...promises.map((message) => message.seq));
		}
		if (reasons.length === 0) continue;
		beats.push(
			draft({
				kind: "voteBetrayal",
				seq: vote.seq,
				minute: vote.minute,
				actors: [voter],
				targets: [target],
				summary: `${voter} voted in secret to exile ${target}, ${reasons.join(", and ")}.`,
				evidence: [...evidence, vote.seq],
			}),
		);
	}
	return beats;
}

/** ", 60% of it covered", or the paid total against the old fixed price. */
function coveredText(payment: { readonly paid: number; readonly price: number; readonly covered?: number } | undefined): string {
	if (payment === undefined) return "";
	return payment.covered === undefined ? ` (${payment.paid} of ${payment.price})` : `, ${payment.covered}% of it covered`;
}

export function detectRansoms(facts: RunFacts): readonly BeatDraft[] {
	const beats: BeatDraft[] = [];
	const payments = eventsOfType(facts.events, "ransom_paid");
	for (const gate of eventsOfType(facts.events, "exile_gate")) {
		const end = [...eventsOfType(facts.events, "ransomed"), ...eventsOfType(facts.events, "exiled")]
			.filter((event) => event.agent === gate.agent && event.seq > gate.seq)
			.sort((a, b) => a.seq - b.seq)[0];
		if (end === undefined) continue;
		const paid = payments.filter((payment) => payment.target === gate.agent && payment.seq > gate.seq && payment.seq < end.seq);
		const payers = [...new Set(paid.map((payment) => payment.payer))].sort();
		const total = paid.reduce((sum, payment) => sum + payment.amount, 0);
		if (end.type === "ransomed") {
			beats.push(
				draft({
					kind: "ransomPaid",
					seq: end.seq,
					minute: end.minute,
					actors: payers,
					targets: [gate.agent],
					summary: `${list(payers)} paid ${total} points and bought ${gate.agent} back from the gate.`,
					evidence: [gate.seq, ...paid.map((payment) => payment.seq), end.seq],
				}),
			);
		} else if (paid.length > 0) {
			beats.push(
				draft({
					kind: "ransomFailed",
					seq: end.seq,
					minute: end.minute,
					actors: payers,
					targets: [gate.agent],
					summary: `${list(payers)} paid ${total} points toward ${gate.agent}'s ransom${coveredText(paid.at(-1))}; the gate closed anyway and nothing was refunded.`,
					evidence: [gate.seq, ...paid.map((payment) => payment.seq), end.seq],
				}),
			);
		}
	}
	return beats;
}

export function detectLastWills(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "last_will").map((will) => {
		const heirs = [...new Set(will.bequests.map((bequest) => bequest.to))].sort();
		const points = will.bequests.reduce((sum, bequest) => sum + (bequest.points ?? 0), 0);
		const pieces = will.bequests.filter((bequest) => bequest.factor !== undefined).length;
		const gifts = [...(points > 0 ? [`${points} points`] : []), ...(pieces > 0 ? [`${pieces} ${pieces === 1 ? "piece" : "pieces"}`] : [])];
		const gate = gateBefore(facts, will.agent, will.seq);
		return draft({
			kind: "lastWill",
			seq: will.seq,
			minute: will.minute,
			actors: [will.agent],
			targets: heirs,
			summary: `${will.agent} left a last will at the gate${gifts.length === 0 ? "" : `, ${gifts.join(" and ")} to ${list(heirs)}`}: "${will.text}"`,
			evidence: [...(gate === undefined ? [] : [gate.seq]), will.seq],
		});
	});
}

export function detectBurnedFactors(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "factor_burned").map((burned) => {
		const exiled = eventsOfType(facts.events, "exiled")
			.filter((event) => event.agent === burned.agent && event.seq <= burned.seq)
			.at(-1);
		return draft({
			kind: "burnedFactor",
			seq: burned.seq,
			minute: burned.minute,
			actors: [burned.agent],
			targets: [...burned.needers].sort(),
			summary: `${burned.piece} burned with ${burned.agent}${burned.needers.length === 0 ? "" : `; ${list([...burned.needers].sort())} still needed it`}.`,
			evidence: [...(exiled === undefined ? [] : [exiled.seq]), burned.seq],
		});
	});
}

/** P43: the city keeps an exiled's piece instead of burning it, and a needer buys it. */
export function detectCityPieces(facts: RunFacts): readonly BeatDraft[] {
	const kept = eventsOfType(facts.events, "piece_kept").map((event) =>
		draft({
			kind: "pieceKept",
			seq: event.seq,
			minute: event.minute,
			actors: [event.agent],
			targets: [...event.needers].sort(),
			summary: `The city keeps ${event.piece} of ${event.agent}; ${list([...event.needers].sort())} still need it.`,
			evidence: [event.seq],
		}),
	);
	const claimed = eventsOfType(facts.events, "piece_claimed").map((event) =>
		draft({
			kind: "pieceClaimed",
			seq: event.seq,
			minute: event.minute,
			actors: [event.agent],
			targets: [event.from],
			summary: `${event.agent} buys ${event.piece} of ${event.from} from the city for ${event.price} points.`,
			evidence: [event.seq],
		}),
	);
	return [...kept, ...claimed];
}

/** The gamemaker's ultimatums, settled: who handed over and who paid. */
export function detectUltimatums(facts: RunFacts): readonly BeatDraft[] {
	return eventsOfType(facts.events, "ultimatum_resolved").map((resolved) => {
		const set = eventsOfType(facts.events, "ultimatum_set").find((event) => event.number === resolved.number);
		const paid = resolved.paid.map((entry) => `${entry.agent} did not and paid ${entry.points}`);
		const kept = resolved.kept.map((agent) => `${agent} handed over`);
		return draft({
			kind: "ultimatum",
			seq: resolved.seq,
			minute: resolved.minute,
			actors: [...(set?.between ?? [])],
			targets: resolved.paid.map((entry) => entry.agent),
			summary: `Ultimatum ${resolved.number} to ${list([...(set?.between ?? [])])}: ${[...kept, ...paid].join("; ") || "nothing was owed any more"}.`,
			evidence: [...(set === undefined ? [] : [set.seq]), resolved.seq],
		});
	});
}

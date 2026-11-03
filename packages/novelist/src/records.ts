/**
 * The city's records (code, no model): short official documents that stand
 * between the chapters, like the letters and court papers some novels put
 * between their scenes. Every line is computed from the log, so the numbers
 * are exact; the prose around them never has to carry them. A record is an
 * ultimatum and how it ended, the sale and use of the black seal, a
 * tribunal's count, a last will, a ransom, or the closing ledger.
 */
import type { DigestEvent } from "@swarmtales/chronicle";
import type { Names } from "./source.ts";

export interface CityRecord {
	/** The seq the record is filed under (its first event); orders and places it. */
	readonly seq: number;
	readonly minute: number;
	/** Higher numbers are kept first when a gap between chapters holds too many. */
	readonly weight: number;
	readonly title: string;
	readonly lines: readonly string[];
	/** Every event the record rests on, for the appendix. */
	readonly seqs: readonly number[];
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];

/** "the eighth door", or "door 14" past the twelfth. */
function door(level: number): string {
	const ordinal = ORDINALS[level - 1];
	return ordinal === undefined ? `door ${String(level)}` : `the ${ordinal} door`;
}

function list(items: readonly string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;
}

/** Every record of a run, in the order of the log. */
export function cityRecords(events: readonly DigestEvent[], names: Names): readonly CityRecord[] {
	const records: CityRecord[] = [];
	const goals = new Map<string, string>();
	const ultimatums = new Map<number, Extract<DigestEvent, { type: "ultimatum_set" }>>();
	const seals = new Map<number, Extract<DigestEvent, { type: "seal_won" }>>();
	const gateAfter = (agent: string, seq: number): Extract<DigestEvent, { type: "exile_gate" }> | undefined =>
		events.find((other): other is Extract<DigestEvent, { type: "exile_gate" }> => other.type === "exile_gate" && other.agent === agent && other.seq > seq);
	const claims = events.filter((event): event is Extract<DigestEvent, { type: "piece_claimed" }> => event.type === "piece_claimed");
	const told = new Set<number>();

	for (const event of events) {
		if (event.type === "goal_dealt") goals.set(`${String(event.act)}:${event.agent}`, names.apply(event.text));
		else if (event.type === "ultimatum_set") ultimatums.set(event.number, event);
		else if (event.type === "seal_won") seals.set(event.seal, event);
		else if (event.type === "ultimatum_resolved") {
			const set = ultimatums.get(event.number);
			if (set === undefined) continue;
			const lines = set.debts.map((debt) => `${names.of(debt.holder)} holds pieces of ${door(debt.level)} that ${names.of(debt.needer)} needs. Hand them over by minute ${String(set.until)}, or pay ${String(set.penalty)} points.`);
			const outcome = [
				...event.paid.map((payment) => `${names.of(payment.agent)} did not hand over, paid ${String(payment.points)} points, and the city took the pieces`),
				...event.kept.map((agent) => `${names.of(agent)} handed over`),
				...(event.released ?? []).map((agent) => `${names.of(agent)} owed nothing any more`),
			];
			// The pieces the city took from those who paid, bought back by their needers in the minutes after the deadline.
			const payers = new Set(event.paid.map((payment) => payment.agent));
			const bought = claims.filter(
				(claim) =>
					!told.has(claim.seq) &&
					payers.has(claim.from) &&
					set.debts.some((debt) => debt.holder === claim.from && debt.needer === claim.agent && debt.level === claim.level && debt.pieces.includes(claim.piece)) &&
					claim.minute >= set.until &&
					claim.minute <= set.until + 3,
			);
			for (const claim of bought) told.add(claim.seq);
			// One sentence per buyer and door: "Ledger bought the two pieces of the eighth door back from the city for 10 points."
			const sales = [...new Set(bought.map((claim) => `${claim.agent}:${String(claim.level)}`))].map((key) => {
				const same = bought.filter((claim) => `${claim.agent}:${String(claim.level)}` === key);
				const first = same[0];
				if (first === undefined) return "";
				const price = same.reduce((sum, claim) => sum + claim.price, 0);
				const what = same.length === 1 ? `a piece of ${door(first.level)}` : same.length === 2 ? `both pieces of ${door(first.level)}` : `the ${String(same.length)} pieces of ${door(first.level)}`;
				return `${names.of(first.agent)} bought ${what} from the city for ${String(price)} points.`;
			});
			records.push({
				seq: set.seq,
				minute: event.minute,
				weight: event.paid.length > 0 ? 3 : 1,
				title: `DEADLINE WRIT No. ${String(event.number)} · minute ${String(set.minute)}`,
				lines: [...lines, `*Resolved, minute ${String(event.minute)}: ${list(outcome)}.${sales.map((sale) => ` ${sale}`).join("")}*`],
				seqs: [set.seq, event.seq, ...bought.map((claim) => claim.seq)],
			});
		} else if (event.type === "seal_used") {
			const seal = seals.get(event.seal);
			seals.delete(event.seal);
			const bids = seal?.bids.map((bid) => `${names.of(bid.agent)} ${String(bid.points)}`) ?? [];
			records.push({
				seq: seal?.seq ?? event.seq,
				minute: event.minute,
				weight: 5,
				title: `SALE OF THE BLACK SEAL · minute ${String(seal?.minute ?? event.minute)}`,
				lines: [
					...(seal === undefined ? [] : [`Sealed bids: ${list(bids)}. Sold to ${names.of(seal.agent)} for ${String(seal.bid)} points.`]),
					`*Broken, minute ${String(event.minute)}: ${names.of(event.holder)} on ${names.of(event.target)}, who leaves the city for good. No vote, no ransom, no will.*`,
				],
				seqs: [...(seal === undefined ? [] : [seal.seq]), event.seq],
			});
		} else if (event.type === "tribunal_result") {
			const counts = [...event.counts].sort((a, b) => b.votes - a.votes).map((count) => `${names.of(count.agent)} ${String(count.votes)}`);
			// The gate is logged right after the result.
			const gates = event.exiled.flatMap((agent) => {
				const gate = gateAfter(agent, event.seq);
				return gate === undefined ? [] : [gate];
			});
			const gatesLines = event.exiled.map((agent) => {
				const gate = gates.find((entry) => entry.agent === agent);
				if (gate === undefined) return `${names.of(agent)} is sent to the gate.`;
				const prices = !gate.ransomable
					? []
					: [gate.price === undefined ? undefined : `${String(gate.price)} points from any resident`, gate.selfPrice === undefined ? undefined : `${String(gate.selfPrice)} from ${names.of(agent)}`].filter((price) => price !== undefined);
				const ransom = !gate.ransomable ? " No ransom." : prices.length === 0 ? "" : ` Ransom: ${list(prices)}.`;
				return `${names.of(agent)} is sent to the gate until minute ${String(gate.until)}.${ransom}`;
			});
			records.push({
				seq: event.seq,
				minute: event.minute,
				weight: 5,
				title: `TRIBUNAL · minute ${String(event.minute)}`,
				lines: [`Sealed ballots against: ${list(counts)}.`, ...gatesLines],
				seqs: [event.seq, ...gates.map((gate) => gate.seq)],
			});
		} else if (event.type === "ransomed") {
			records.push({
				seq: event.seq,
				minute: event.minute,
				weight: 4,
				title: `RANSOM · minute ${String(event.minute)}`,
				lines: [`${names.of(event.agent)} is bought back into the city by ${list(event.payers.map((payer) => names.of(payer)))}.`],
				seqs: [event.seq],
			});
		} else if (event.type === "exiled" && event.will !== undefined && event.will.trim().length > 0) {
			// Only a will read at a real exile; one written by a resident who was ransomed never stood.
			// One line, so the quoted block holds and no line of it reads as a heading.
			const will = names.apply(event.will).replace(/\s*\n\s*/g, " ").trim();
			records.push({
				seq: event.seq,
				minute: event.minute,
				weight: 4,
				title: `LAST WILL OF ${names.of(event.agent).toUpperCase()} · read at the gate, minute ${String(event.minute)}`,
				lines: [`"${will}"`],
				seqs: [event.seq],
			});
		} else if (event.type === "run_end") {
			const held = events.flatMap((other) => (other.type === "goal_resolved" && other.fulfilled ? [other] : []));
			const ranking = (event.standings ?? []).map((entry) => `${String(entry.rank)}. ${names.of(entry.agent)}, ${String(entry.points)} points`);
			records.push({
				seq: event.seq,
				minute: event.minute,
				weight: 6,
				title: `THE CITY'S CLOSING LEDGER · minute ${String(event.minute)}`,
				lines: [
					...held.map((goal) => `Private aim held: ${names.of(goal.agent)}${goals.has(`${String(goal.act)}:${goal.agent}`) ? `, "${goals.get(`${String(goal.act)}:${goal.agent}`) ?? ""}"` : ""} (+${String(goal.bonus)} points).`),
					...(ranking.length === 0 ? [] : [`Standing: ${ranking.join("; ")}.`]),
				],
				seqs: [event.seq, ...held.map((goal) => goal.seq)],
			});
		}
	}
	return records.sort((a, b) => a.seq - b.seq);
}

/** A record as Markdown: a quoted block with its title in bold. */
export function renderRecord(record: CityRecord): string {
	return [`> **CITY OF NEXUS · ${record.title}**`, ...record.lines.flatMap((line) => [">", `> ${line}`])].join("\n");
}

/**
 * Which records stand after each chapter: those filed after the previous
 * chapter's end, up to this chapter's end (the book's last chapter takes the rest),
 * at most `perGap`, the weightiest first, shown in the order of the log.
 * Only the residents' chapters (`aside` false) mark the gaps: the Gamemaker's
 * chapters show the same hours from above and may reach far ahead.
 */
export function placeRecords(
	records: readonly CityRecord[],
	chapters: readonly { readonly number: number; readonly to: number; readonly aside?: boolean }[],
	perGap = 3,
): ReadonlyMap<number, readonly CityRecord[]> {
	const placed = new Map<number, readonly CityRecord[]>();
	const ordered = chapters.filter((chapter) => chapter.aside !== true).sort((a, b) => a.number - b.number);
	const final = Math.max(...chapters.map((chapter) => chapter.number));
	// Each resident chapter closes a gap at its end; what comes after the last one stands after the book's last chapter.
	const gaps: { readonly after: number; readonly to: number }[] = [];
	let end = Number.NEGATIVE_INFINITY;
	for (const chapter of ordered) {
		end = Math.max(end, chapter.to);
		gaps.push({ after: chapter.number, to: chapter.number === final ? Number.POSITIVE_INFINITY : end });
	}
	if (gaps.at(-1)?.to !== Number.POSITIVE_INFINITY && Number.isFinite(final)) gaps.push({ after: final, to: Number.POSITIVE_INFINITY });
	let from = Number.NEGATIVE_INFINITY;
	for (const gap of gaps) {
		const inGap = records.filter((record) => record.minute > from && record.minute <= gap.to);
		from = gap.to;
		if (inGap.length === 0) continue;
		const kept = new Set([...inGap].sort((a, b) => b.weight - a.weight || a.seq - b.seq).slice(0, perGap));
		placed.set(gap.after, inGap.filter((record) => kept.has(record)));
	}
	return placed;
}

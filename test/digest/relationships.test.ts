import { describe, expect, it } from "vitest";
import { renderDigest } from "@swarmtales/chronicle";
import { LogBuilder } from "../helpers/event-log.ts";

describe("relationship graph", () => {
	it("records DMs, group posts, shares, transfers, shown receipts, shared groups and kicks per pair over time", () => {
		const log = new LogBuilder();
		log.deal(3, { A01: "KQ7", A02: "Q7MZ" });
		log.at(1).dm("A01", "A02", "KQ7");
		log.dm("COURIER", "A01", "system lines do not count");
		log.at(2).group("G1", "A01", ["A02", "A03"]);
		log.post("G1", "A02", "hi all");
		log.at(3).transfer("A02", "A01", 4, "thanks");
		log.receipt("R-0001", "transfer", ["A02", "A01"]);
		log.add({ type: "receipt_shown", receipt: "R-0001", by: "A01", postSeq: 1 });
		log.at(4).add({ type: "group_membership", group: "G1", agent: "A02", change: "removed", by: "A01" });
		log.transfer("A01", "A02", 1);

		const analysis = log.analyze();
		const { graph } = renderDigest(analysis);
		const pair = graph.pairs.find((entry) => entry.a === "A01" && entry.b === "A02");
		expect(pair).toMatchObject({
			firstMinute: 1,
			lastMinute: 4,
			dms: { aToB: 1, bToA: 0 },
			groupPosts: { aToB: 0, bToA: 1 },
			fragmentShares: { aToB: 1, bToA: 0 },
			transfers: { aToB: 1, bToA: 1 },
			points: { aToB: 1, bToA: 4 },
			receiptsShown: 1,
			sharedGroups: ["G1"],
		});
		expect(pair?.interactions.map((entry) => entry.kind)).toEqual(["dm", "fragmentShare", "sharedGroup", "groupPost", "transfer", "receiptShown", "kick", "transfer"]);
		expect(pair?.byMinute.map((entry) => entry.minute)).toEqual([1, 2, 3, 4]);
		expect(pair?.byMinute[2]).toMatchObject({ points: { aToB: 0, bToA: 4 }, receiptsShown: 1 });
		// The alliance (reciprocal transfers) and the kick are linked to the pair.
		expect(pair?.beats).toEqual(analysis.beats.map((beat) => beat.id));
		expect(analysis.beats.map((beat) => beat.kind).sort()).toEqual(["alliance", "kick"]);
		expect(graph.pairs.map((entry) => `${entry.a}|${entry.b}`)).toEqual(["A01|A02", "A01|A03", "A02|A03"]);
		expect(graph.pairs.some((entry) => entry.a === "COURIER" || entry.b === "COURIER")).toBe(false);
	});
});

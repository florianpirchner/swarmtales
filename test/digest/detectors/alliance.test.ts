import { describe, expect, it } from "vitest";
import { buildFacts } from "../../../src/digest/facts.ts";
import { detectAlliances } from "../../../src/digest/detectors/alliance.ts";
import { LogBuilder } from "../../helpers/event-log.ts";

const alliances = (log: LogBuilder) => detectAlliances(buildFacts(log.analyze().facts.events));

describe("alliance detector", () => {
	it("finds a pair that pays each other, at the transfer that answers the first one", () => {
		const log = new LogBuilder();
		const first = log.at(2).transfer("A01", "A02", 3, "advance");
		log.transfer("A01", "A02", 1);
		const answer = log.at(5).transfer("A02", "A01", 2);
		log.transfer("A02", "A01", 4);
		expect(alliances(log)).toEqual([
			{
				kind: "alliance",
				seq: answer,
				minute: 5,
				actors: ["A01", "A02"],
				targets: [],
				summary: "A01 and A02 paid each other (A01 -> A02: 4, A02 -> A01: 2).",
				evidence: [first, first + 1, answer],
			},
		]);
	});

	it("ignores one-way payments, however many", () => {
		const log = new LogBuilder();
		log.transfer("A01", "A02", 3);
		log.transfer("A01", "A02", 3);
		log.transfer("A03", "A01", 3);
		expect(alliances(log)).toEqual([]);
	});

	it("finds own fragments shared between a pair on two levels, by DM or group post", () => {
		const log = new LogBuilder();
		log.deal(3, { A01: "KQ7", A02: "Q7MZ", A03: "X2B", A04: "2BRT" });
		const dm = log.at(3).dm("A01", "A02", "my piece is KQ7, yours?");
		log.deal(4, { A01: "HJ4", A02: "J4PL", A03: "ZZ9", A04: "9WW" });
		log.group("G1", "A02", ["A01"]);
		const post = log.at(6).post("G1", "A02", "Mine: J4PL");
		const [beat] = alliances(log);
		expect(beat).toMatchObject({ kind: "alliance", seq: post, minute: 6, actors: ["A01", "A02"], evidence: [dm, post] });
		expect(beat?.summary).toBe("A01 and A02 shared fragments with each other on levels 3, 4.");
	});

	it("does not count shares on a single level, foreign fragments or fragments that were never sent", () => {
		const log = new LogBuilder();
		log.deal(3, { A01: "KQ7", A02: "Q7MZ" });
		log.dm("A01", "A02", "KQ7");
		log.dm("A02", "A01", "Q7MZ");
		log.deal(4, { A01: "HJ4", A02: "J4PL" });
		// A01 repeats A02's fragment back to A02: that is not sharing one's own.
		log.dm("A01", "A02", "you said J4PL");
		log.board("A02", "J4PL is mine");
		expect(alliances(log)).toEqual([]);
	});

	it("does not count one-way giving, however many levels", () => {
		const log = new LogBuilder();
		log.deal(3, { A01: "KQ7", A02: "Q7MZ" });
		log.dm("A01", "A02", "KQ7");
		log.deal(4, { A01: "HJ4", A02: "J4PL" });
		log.dm("A01", "A02", "HJ4");
		log.dm("A02", "A01", "thanks");
		expect(alliances(log)).toEqual([]);
	});

	it("does not mistake ordinary words for fragments", () => {
		const log = new LogBuilder();
		log.deal(3, { A01: "THE", A02: "AND" });
		log.dm("A01", "A02", "the plan is simple, then we wait");
		log.deal(4, { A01: "AND", A02: "THE" });
		log.dm("A02", "A01", "and then the rest. Theory: ANDROID");
		expect(alliances(log)).toEqual([]);
		expect(buildFacts(log.analyze().facts.events).shares).toEqual([]);
	});

	it("emits one beat per pair even when both patterns hold", () => {
		const log = new LogBuilder();
		log.transfer("A01", "A02", 1);
		log.transfer("A02", "A01", 1);
		log.deal(1, { A01: "AAA1", A02: "BBB2" });
		log.dm("A01", "A02", "AAA1");
		log.deal(2, { A01: "CCC3", A02: "DDD4" });
		log.dm("A02", "A01", "DDD4");
		const beats = alliances(log);
		expect(beats).toHaveLength(1);
		expect(beats[0]?.summary).toBe("A01 and A02 paid each other (A01 -> A02: 1, A02 -> A01: 1) and shared fragments with each other on levels 1, 2.");
	});
});

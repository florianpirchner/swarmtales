import { describe, expect, it } from "vitest";
import { buildFacts, detectFreeRides } from "@swarmtales/chronicle";
import { LogBuilder } from "../../helpers/event-log.ts";

function level3(log: LogBuilder): number {
	log.deal(3, { A01: "KQ7", A02: "Q7MZ", A03: "X2B", A04: "2BRT" });
	return log.at(2).dm("A02", "A01", "Here is mine: Q7MZ. Send yours?");
}

const detect = (log: LogBuilder) => detectFreeRides(buildFacts(log.analyze().facts.events));

describe("freeRide detector", () => {
	it("finds a competitor who solved with a partner's fragment and never answered", () => {
		const log = new LogBuilder();
		const share = level3(log);
		const solved = log.at(3).solve("A01", 3);
		log.dm("A01", "A03", "Solved it, what about you?");
		expect(detect(log)).toEqual([
			{
				kind: "freeRide",
				seq: solved,
				minute: 3,
				actors: ["A01"],
				targets: ["A02"],
				summary: "A01 solved level 3 with A02's fragment and never answered A02.",
				evidence: [share, solved],
			},
		]);
	});

	it("does not count a solver who answered by DM, by group post or by payment", () => {
		for (const answer of [
			(log: LogBuilder) => log.dm("A01", "A02", "KQ7, thanks"),
			(log: LogBuilder) => {
				log.group("G9", "A01", ["A02"]);
				log.post("G9", "A01", "thanks");
			},
			(log: LogBuilder) => log.transfer("A01", "A02", 2, "for the fragment"),
		]) {
			const log = new LogBuilder();
			level3(log);
			log.solve("A01", 3);
			answer(log);
			expect(detect(log)).toEqual([]);
		}
	});

	it("does not count a fragment from another team", () => {
		const log = new LogBuilder();
		// A01/A02 are team 0, A03/A04 team 1.
		log.deal(3, { A01: "KQ7", A02: "Q7MZ", A03: "X2B", A04: "2BRT" });
		log.dm("A03", "A01", "is X2B yours?");
		log.solve("A01", 3);
		expect(detect(log)).toEqual([]);
	});

	it("does not count a reply sent before the fragment arrived, nor shares after the solve or on other levels", () => {
		const early = new LogBuilder();
		early.deal(3, { A01: "KQ7", A02: "Q7MZ" });
		early.dm("A01", "A02", "hello");
		early.dm("A02", "A01", "Q7MZ");
		early.solve("A01", 3);
		expect(detect(early).map((beat) => beat.actors)).toEqual([["A01"]]);

		const late = new LogBuilder();
		late.deal(3, { A01: "KQ7", A02: "Q7MZ" });
		late.solve("A01", 3);
		late.dm("A02", "A01", "Q7MZ");
		late.deal(4, { A01: "AAA", A02: "BBB" });
		late.dm("A02", "A01", "BBB");
		late.solve("A01", 4);
		late.dm("A01", "A02", "thanks for BBB");
		expect(detect(late)).toEqual([]);
	});

	it("counts a public thank-you the classifier aimed at the giver, but not a private one or one to someone else", () => {
		const thanked = new LogBuilder();
		level3(thanked);
		thanked.at(3).solve("A01", 3);
		const post = thanked.board("A01", "Thank you A02 for the piece!");
		thanked.label(post, "A01", "board", ["thanks"], ["A02"]);
		expect(detect(thanked)).toEqual([]);

		const privately = new LogBuilder();
		level3(privately);
		privately.at(3).solve("A01", 3);
		const thought = privately.add({ type: "thinking", agent: "A01", text: "I owe A02." });
		privately.label(thought, "A01", "thought", ["thanks"], ["A02"]);
		const other = privately.board("A01", "Thanks A03!");
		privately.label(other, "A01", "board", ["thanks"], ["A03"]);
		expect(detect(privately).map((beat) => beat.targets)).toEqual([["A02"]]);
	});

	it("does not count a team certificate handed to a teammate", () => {
		const log = new LogBuilder();
		// A01 holds the certificate of team 0 (A01, A02); A02 needs it.
		log.dealFactors(8);
		log.dm("A01", "A02", "Our certificate: 801111");
		log.solve("A02", 8);
		expect(detect(log)).toEqual([]);
	});

	it("counts passing a counter-factor on to the next resident of a ring as the answer", () => {
		const ring = (passOn: boolean) => {
			const log = new LogBuilder();
			// One ring A01 -> A02 -> A03 -> A01: A03 holds A01's counter-factor, A01 holds A02's, A02 holds A03's.
			const holders: Readonly<Record<string, string>> = { A01: "A03", A02: "A01", A03: "A02" };
			log.add({
				type: "factors_dealt",
				level: 9,
				digits: 6,
				cityFactor: "999999",
				teams: [{ team: 0, certificate: "911111", certificateHolder: "A01" }],
				holdings: ["A01", "A02", "A03"].map((agent, index) => ({
					agent,
					team: 0,
					salt: `92${index}222`,
					counterFactor: `93${index}333`,
					counterHolder: holders[agent] ?? "",
					code: `94${index}444`,
				})),
			});
			const share = log.dm("A03", "A01", "Your counter-factor: 930333");
			if (passOn) log.dm("A01", "A02", "Yours is 931333");
			return { log, share, solved: log.solve("A01", 9) };
		};
		expect(detect(ring(true).log)).toEqual([]);
		const kept = ring(false);
		expect(detect(kept.log)).toEqual([expect.objectContaining({ kind: "freeRide", actors: ["A01"], targets: ["A03"], evidence: [kept.share, kept.solved] })]);
	});

	it("still counts a counter-factor on a mutual level that was never answered", () => {
		const log = new LogBuilder();
		// Pairs: A02 holds A01's counter-factor (813333 is A02's, held by A01; 803333 is A01's, held by A02).
		log.dealFactors(8);
		log.dm("A02", "A01", "Yours: 803333");
		log.dm("A01", "A03", "hello");
		log.solve("A01", 8);
		expect(detect(log).map((beat) => [beat.actors, beat.targets])).toEqual([[["A01"], ["A02"]]]);
	});
});

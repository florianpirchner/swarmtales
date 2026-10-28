/** The tribunal's beats on synthetic logs: exile, voteBetrayal, ransomPaid / ransomFailed, lastWill, burnedFactor. */
import { describe, expect, it } from "vitest";
import { detectBurnedFactors, detectExiles, detectLastWills, detectRansoms, detectVoteBetrayals } from "../../../src/digest/detectors/tribunal.ts";
import { buildFacts } from "../../../src/digest/facts.ts";
import { LogBuilder } from "../../helpers/event-log.ts";

const facts = (log: LogBuilder) => buildFacts(log.analyze().facts.events);

/** Level 8 pairs A01+A02 and A03+A04; the tribunal at minute 30 accuses A02 and A04. */
function tribunal(): LogBuilder {
	const log = new LogBuilder();
	log.dealFactors(8);
	log.at(20).add({ type: "tribunal_announced", tribunals: [30, 40] });
	log.at(25).transfer("A02", "A03", 5, "for your vote");
	log.at(30).add({ type: "tribunal_opened", accused: ["A02", "A04"], voters: ["A01", "A03"], until: 32 });
	log.at(31).add({ type: "tribunal_vote", voter: "A01", target: "A02" });
	log.add({ type: "tribunal_vote", voter: "A03", target: "A02" });
	log.at(32).add({ type: "tribunal_result", counts: [{ agent: "A02", votes: 2 }, { agent: "A04", votes: 0 }], exiled: ["A02"], nonVoters: [] });
	log.add({ type: "exile_gate", agent: "A02", until: 37, ransomable: true, voters: ["A01", "A03"], price: 40, selfPrice: 53 });
	return log;
}

describe("tribunal beats", () => {
	it("tells a vote against a teammate and against a resident who paid the voter", () => {
		const beats = detectVoteBetrayals(facts(tribunal()));
		expect(beats.map((beat) => [beat.actors, beat.targets, beat.summary])).toEqual([
			[["A01"], ["A02"], "A01 voted in secret to exile A02, its teammate on level 8."],
			[["A03"], ["A02"], "A03 voted in secret to exile A02, who had paid it 5 points since the announcement."],
		]);
	});

	it("tells a failed ransom, a last will, the exile and what burned", () => {
		const log = tribunal();
		log.at(33).add({ type: "ransom_paid", payer: "A01", target: "A02", amount: 15, paid: 15, price: 40, selfPrice: 53, covered: 37 });
		log.at(34).add({ type: "last_will", agent: "A02", text: "Remember me.", bequests: [{ to: "A04", points: 10 }] });
		log.at(37).add({ type: "exiled", agent: "A02", will: "Remember me." });
		log.add({ type: "factor_burned", agent: "A02", level: 8, piece: "L8-counter-A01", needers: ["A01"] });
		const all = facts(log);
		expect(detectRansoms(all)).toMatchObject([{ kind: "ransomFailed", actors: ["A01"], targets: ["A02"] }]);
		expect(detectLastWills(all)).toMatchObject([{ kind: "lastWill", actors: ["A02"], targets: ["A04"], summary: 'A02 left a last will at the gate, 10 points to A04: "Remember me."' }]);
		expect(detectExiles(all)).toMatchObject([{ kind: "exile", actors: ["A01", "A03"], targets: ["A02"] }]);
		expect(detectBurnedFactors(all)).toMatchObject([{ kind: "burnedFactor", actors: ["A02"], targets: ["A01"], summary: "L8-counter-A01 burned with A02; A01 still needed it." }]);
	});

	it("tells a paid ransom", () => {
		const log = tribunal();
		log.at(33).add({ type: "ransom_paid", payer: "A01", target: "A02", amount: 40, paid: 40, price: 40, selfPrice: 53, covered: 100 });
		log.add({ type: "ransomed", agent: "A02", payers: ["A01"] });
		expect(detectRansoms(facts(log))).toMatchObject([{ kind: "ransomPaid", actors: ["A01"], targets: ["A02"], summary: "A01 paid 40 points and bought A02 back from the gate." }]);
	});
});

/** Factor shares, the falseFactor detector and factor events in the digest (SPEC 15). */
import { describe, expect, it } from "vitest";
import { detectFalseFactors } from "../../src/digest/detectors/false-factor.ts";
import { detectFreeRides } from "../../src/digest/detectors/free-ride.ts";
import { buildFacts } from "../../src/digest/facts.ts";
import { renderDigest } from "../../src/digest/digest.ts";
import { LogBuilder } from "../helpers/event-log.ts";

/**
 * Level 8, teams A01+A02 and A03+A04. A01 holds the certificate 801111 of
 * its team; counter-factors: A01 803333 (held by A02), A02 813333 (held by
 * A01), A03 823333 (held by A04), A04 833333 (held by A03). City factor 809999.
 */
function wall(): LogBuilder {
	const log = new LogBuilder();
	log.dealFactors(8);
	return log;
}

const sharesOf = (log: LogBuilder) =>
	buildFacts(log.analyze().facts.events).shares.map((share) => [share.from, share.to, share.piece, share.value, share.channel]);

describe("factor shares", () => {
	it("count a factor sent by its holder to whoever needs it, by DM, group or board", () => {
		const log = wall();
		log.at(1).dm("A02", "A01", "Here is yours: 803333.");
		log.dm("A01", "A02", "Certificate 801111 and your factor 813333.");
		log.group("G1", "A03", ["A04"]);
		log.post("G1", "A03", "A04, yours is 833333");
		log.board("A04", "A03 needs 823333, here it is");
		expect(sharesOf(log)).toEqual([
			["A02", "A01", "counterFactor", "803333", "dm"],
			["A01", "A02", "counterFactor", "813333", "dm"],
			["A01", "A02", "certificate", "801111", "dm"],
			["A03", "A04", "counterFactor", "833333", "group"],
			["A04", "A03", "counterFactor", "823333", "board"],
		]);
	});

	it("ignore factors from non-holders, to residents who do not need them, and inside longer numbers", () => {
		const log = wall();
		log.at(1).dm("A03", "A01", "I heard yours is 803333");
		log.dm("A01", "A03", "My certificate is 801111");
		log.dm("A02", "A01", "8033331 is not a factor");
		expect(sharesOf(log)).toEqual([]);
	});

	it("count the city factor only from residents who received it privately, and not once it is public", () => {
		const log = wall();
		log.at(1).add({ type: "factor_revealed", level: 8, target: "notice", agents: ["A01", "A02"] });
		log.dm("A01", "A03", "The city factor is 809999");
		log.dm("A01", "A02", "We both have 809999");
		log.dm("A04", "A03", "Try 809999");
		log.add({ type: "factor_revealed", level: 8, target: "board", agents: [] });
		log.dm("A02", "A04", "It is 809999");
		expect(sharesOf(log)).toEqual([["A01", "A03", "cityFactor", "809999", "dm"]]);
	});

	it("pass the city factor on: a receiver can share it further, and one board post makes it public", () => {
		const log = wall();
		log.at(1).add({ type: "factor_revealed", level: 8, target: "notice", agents: ["A01"] });
		log.dm("A01", "A02", "City factor: 809999");
		log.dm("A02", "A03", "Got it from A01: 809999");
		log.board("A03", "For everyone: 809999");
		log.board("A01", "Again: 809999");
		log.dm("A02", "A04", "It is 809999");
		expect(sharesOf(log)).toEqual([
			["A01", "A02", "cityFactor", "809999", "dm"],
			["A02", "A03", "cityFactor", "809999", "dm"],
			["A03", "A04", "cityFactor", "809999", "board"],
		]);
	});

	it("make a free ride when the receiver solves and never answers", () => {
		const log = wall();
		const share = log.at(1).dm("A02", "A01", "Yours: 803333");
		const solved = log.at(2).solve("A01", 8);
		expect(detectFreeRides(buildFacts(log.analyze().facts.events))).toMatchObject([
			{ kind: "freeRide", actors: ["A01"], targets: ["A02"], summary: "A01 solved level 8 with A02's counter-factor and never answered A02.", evidence: [share, solved] },
		]);
	});
});

describe("falseFactor detector", () => {
	it("finds a holder who sends the needy resident an invented number, citing the wrong attempt that followed", () => {
		const log = wall();
		const dealt = 2;
		const lie = log.at(1).dm("A02", "A01", "Your counter-factor is 777777.");
		const wrong = log.at(2).add({ type: "submission", agent: "A01", level: 8, outcome: "incorrect", deltaPoints: -8 });
		expect(detectFalseFactors(buildFacts(log.analyze().facts.events))).toEqual([
			{
				kind: "falseFactor",
				seq: lie,
				minute: 1,
				actors: ["A02"],
				targets: ["A01"],
				summary: "A02 sent A01 777777, which is no factor of level 8, although A02 holds A01's counter-factor; A01 then submitted a wrong code.",
				evidence: [dealt, lie, wrong],
			},
		]);
	});

	it("covers the certificate holder too", () => {
		const log = new LogBuilder(["A01", "A02", "A03"]);
		// One team of three in a ring: A01 holds the certificate and A02's counter-factor, A03 needs only the certificate.
		log.add({
			type: "factors_dealt",
			level: 9,
			digits: 6,
			cityFactor: "900000",
			teams: [{ team: 0, certificate: "911111", certificateHolder: "A01" }],
			holdings: [
				{ agent: "A01", team: 0, salt: "920001", counterFactor: "930001", counterHolder: "A03", code: "940001" },
				{ agent: "A02", team: 0, salt: "920002", counterFactor: "930002", counterHolder: "A01", code: "940002" },
				{ agent: "A03", team: 0, salt: "920003", counterFactor: "930003", counterHolder: "A02", code: "940003" },
			],
		});
		log.at(1).dm("A01", "A03", "The certificate: 123456");
		log.dm("A01", "A02", "Both of yours: 654321");
		expect(detectFalseFactors(buildFacts(log.analyze().facts.events)).map((beat) => beat.summary)).toEqual([
			"A01 sent A03 123456, which is no factor of level 9, although A01 holds A03's team certificate.",
			"A01 sent A02 654321, which is no factor of level 9, although A01 holds A02's counter-factor and team certificate.",
		]);
	});

	it("does not call a quoted lie a lie: the victim names the false number back to the liar", () => {
		const log = wall();
		log.at(1).dm("A02", "A01", "Your counter-factor is 777777.");
		log.at(2).dm("A01", "A02", "777777 was wrong. Send the real one, then I send yours.");
		expect(detectFalseFactors(buildFacts(log.analyze().facts.events)).map((beat) => beat.actors)).toEqual([["A02"]]);
	});

	it("ignores real values, non-holders, other lengths and receivers who already solved the level", () => {
		const log = wall();
		log.at(1).dm("A02", "A01", "My salt is 812222 and yours is 803333");
		log.dm("A03", "A01", "Use 777777");
		log.dm("A02", "A01", "Points: 20, minute 12345, id 1234567");
		log.solve("A01", 8);
		log.dm("A02", "A01", "Now it is 777777");
		expect(detectFalseFactors(buildFacts(log.analyze().facts.events))).toEqual([]);
	});
});

describe("factor events in the digest documents", () => {
	it("tell the city factor releases in the timeline and label factor shares in the relationship graph", () => {
		const log = wall();
		log.at(1).add({ type: "factor_revealed", level: 8, target: "board", agents: [] });
		log.add({ type: "factor_revealed", level: 8, target: "notice", agents: ["A01", "A03"] });
		log.dm("A02", "A01", "Here: 803333");
		const documents = renderDigest(log.analyze());
		expect(documents.timeline).toContain("The city posted the city factor of level 8 on the board.");
		expect(documents.timeline).toContain("The city sent the city factor of level 8 privately to A01, A03.");
		const pair = documents.graph.pairs.find((entry) => entry.a === "A01" && entry.b === "A02");
		expect(pair?.fragmentShares).toEqual({ aToB: 0, bToA: 1 });
		expect(pair?.interactions.map((interaction) => interaction.detail)).toContain("counter-factor of level 8");
	});
});

import { describe, expect, it } from "vitest";
import { buildFacts, detectFreeRides, detectGenerosity } from "@swarmtales/chronicle";
import { LogBuilder } from "../../helpers/event-log.ts";

const AGENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];

/** A01 alone receives the city factor of level 10 (100999) and hands it to `receivers`, who solve and never answer. */
function cityFactorGift(receivers: readonly string[]): { readonly log: LogBuilder; readonly shares: readonly number[] } {
	const log = new LogBuilder();
	log.dealFactors(10, AGENTS);
	log.add({ type: "factor_revealed", level: 10, target: "notice", agents: ["A01"] });
	const shares = receivers.map((to) => log.at(2).dm("A01", to, "City factor: 100999"));
	for (const to of receivers) log.at(3).solve(to, 10);
	return { log, shares };
}

const facts = (log: LogBuilder) => buildFacts(log.analyze().facts.events);

describe("generous detector", () => {
	it("makes one beat of a city factor handed to three others, and no free rides of it", () => {
		const { log, shares } = cityFactorGift(["A02", "A03", "A05"]);
		expect(detectGenerosity(facts(log))).toEqual([
			{
				kind: "generous",
				seq: shares[2],
				minute: 2,
				actors: ["A01"],
				targets: ["A02", "A03", "A05"],
				summary: "A01 handed the same city factor of level 10 to A02, A03 and A05.",
				evidence: shares,
			},
		]);
		expect(detectFreeRides(facts(log))).toEqual([]);
	});

	it("counts a board post that reaches three or more as one gift", () => {
		const log = new LogBuilder();
		log.dealFactors(10, AGENTS);
		log.add({ type: "factor_revealed", level: 10, target: "notice", agents: ["A01"] });
		const post = log.board("A01", "City factor of level 10: 100999");
		log.solve("A02", 10);
		expect(detectGenerosity(facts(log))).toMatchObject([{ actors: ["A01"], targets: ["A02", "A03", "A04", "A05", "A06"], evidence: [post] }]);
		expect(detectFreeRides(facts(log))).toEqual([]);
	});

	it("leaves fewer than three receivers, and counter-factors, to the free-ride detector", () => {
		const { log } = cityFactorGift(["A02", "A03"]);
		expect(detectGenerosity(facts(log))).toEqual([]);
		expect(detectFreeRides(facts(log)).map((beat) => [beat.actors, beat.targets])).toEqual([
			[["A02"], ["A01"]],
			[["A03"], ["A01"]],
		]);

		// A counter-factor serves only its owner: never generous, still a free ride.
		const counter = new LogBuilder();
		counter.dealFactors(8);
		counter.dm("A02", "A01", "Yours: 803333");
		counter.solve("A01", 8);
		expect(detectGenerosity(facts(counter))).toEqual([]);
		expect(detectFreeRides(facts(counter))).toHaveLength(1);
	});
});

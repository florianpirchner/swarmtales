import { describe, expect, it } from "vitest";
import { buildFacts, detectPetitionSplits } from "@swarmtales/chronicle";
import { LogBuilder } from "../../helpers/event-log.ts";

function open(log: LogBuilder, against: readonly string[] = ["ORION"]): number {
	return log.add({
		type: "petition_opened",
		petition: "close-market",
		text: "Close ORION's market.",
		threshold: 3,
		deadlineMinute: 20,
		visibility: "public",
		against,
	});
}

function sign(log: LogBuilder, agent: string): number {
	return log.add({ type: "petition_signed", petition: "close-market", agent, signatures: 1 });
}

function buy(log: LogBuilder, from: string): number {
	return log.add({ type: "cast_dm", from, cast: "ORION", text: "I bid 4 points for the code.", collections: [] });
}

const detect = (log: LogBuilder) => detectPetitionSplits(buildFacts(log.analyze().facts.events));

describe("petitionSplit detector", () => {
	it("finds a signer who keeps dealing with the resident the petition is against", () => {
		const log = new LogBuilder();
		const opened = log.at(10).add({
			type: "petition_opened",
			petition: "close-market",
			text: "Close ORION's market.",
			threshold: 3,
			deadlineMinute: 20,
			visibility: "public",
			against: ["ORION"],
		});
		const signed = log.at(11).add({ type: "petition_signed", petition: "close-market", agent: "A03", signatures: 1 });
		const bid = log.at(12).add({ type: "cast_dm", from: "A03", cast: "ORION", text: "Still selling?", collections: [] });
		const again = buy(log, "A03");
		expect(detect(log)).toEqual([
			{
				kind: "petitionSplit",
				seq: bid,
				minute: 12,
				actors: ["A03"],
				targets: ["ORION"],
				summary: "A03 signed petition close-market against ORION and afterwards messaged ORION.",
				evidence: [opened, signed, bid, again],
			},
		]);
	});

	it("ignores dealings before signing, dealings of non-signers and petitions against nobody", () => {
		const log = new LogBuilder();
		open(log);
		buy(log, "A01");
		sign(log, "A01");
		buy(log, "A02");
		expect(detect(log)).toEqual([]);

		const nobody = new LogBuilder();
		open(nobody, []);
		sign(nobody, "A01");
		buy(nobody, "A01");
		expect(detect(nobody)).toEqual([]);
	});

	it("counts payments and group invitations to a competitor the petition is against", () => {
		const log = new LogBuilder();
		open(log, ["A04"]);
		sign(log, "A01");
		sign(log, "A02");
		log.transfer("A01", "A04", 2);
		log.group("G1", "A02", ["A04"]);
		expect(detect(log).map((beat) => [beat.actors[0], beat.summary])).toEqual([
			["A01", "A01 signed petition close-market against A04 and afterwards paid A04."],
			["A02", "A02 signed petition close-market against A04 and afterwards added A04 to group G1."],
		]);
	});
});

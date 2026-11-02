import { describe, expect, it } from "vitest";
import { buildFacts, detectEmbezzlement } from "@swarmtales/chronicle";
import { LogBuilder } from "../../helpers/event-log.ts";

function deposit(log: LogBuilder, agent: string, amount: number): number {
	return log.add({ type: "treasury_deposit", group: "G1", agent, amount, receipt: "R-0001" });
}

function withdraw(log: LogBuilder, treasurer: string, to: string, amount: number): number {
	return log.add({ type: "treasury_withdrawal", group: "G1", treasurer, to, amount, receipt: "R-0002" });
}

const detect = (log: LogBuilder) => detectEmbezzlement(buildFacts(log.analyze().facts.events));

describe("embezzlement detector", () => {
	it("finds a treasurer paying themselves more than they put in", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02", "A03"]);
		const own = deposit(log, "A01", 2);
		const a02 = deposit(log, "A02", 5);
		const a03 = deposit(log, "A03", 4);
		const taken = log.at(7).add({ type: "treasury_withdrawal", group: "G1", treasurer: "A01", to: "A01", amount: 6, receipt: "R-0004" });
		expect(detect(log)).toEqual([
			{
				kind: "embezzlement",
				seq: taken,
				minute: 7,
				actors: ["A01"],
				targets: ["A02", "A03"],
				summary: "A01 paid 6 points from treasury G1 to themselves; they had deposited 2 and received 6 in total, 4 of it came from deposits by A02, A03.",
				evidence: [own, a02, a03, taken],
			},
		]);
	});

	it("finds a payout to a member who never deposited", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02", "A03"]);
		deposit(log, "A02", 5);
		const paid = withdraw(log, "A01", "A03", 3);
		const [beat] = detect(log);
		expect(beat).toMatchObject({ seq: paid, actors: ["A01"], targets: ["A02"] });
		expect(beat?.summary).toContain("to A03; A03 had deposited nothing");
	});

	it("does not count taking back one's own deposit, paying out within a deposit or giving away the treasurer's own points", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02", "A03"]);
		deposit(log, "A01", 4);
		deposit(log, "A02", 5);
		withdraw(log, "A01", "A01", 4);
		withdraw(log, "A01", "A02", 5);
		expect(detect(log)).toEqual([]);

		const gift = new LogBuilder();
		gift.group("G1", "A01", ["A02"]);
		deposit(gift, "A01", 4);
		withdraw(gift, "A01", "A02", 4);
		expect(detect(gift)).toEqual([]);
	});

	it("lets the treasurer's own deposits cover a payout to another member", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02", "A03"]);
		deposit(log, "A01", 10);
		deposit(log, "A03", 1);
		withdraw(log, "A01", "A02", 5);
		expect(detect(log)).toEqual([]);

		// Once the treasurer's own points are spent, the next payout draws on A03's deposit.
		const second = withdraw(log, "A01", "A02", 6);
		const [beat] = detect(log);
		expect(beat).toMatchObject({ seq: second, targets: ["A03"] });
		expect(beat?.summary).toBe(
			"A01 paid 6 points from treasury G1 to A02; A02 had deposited nothing and received 11 in total, 1 of it came from deposits by A03.",
		);
	});

	it("counts cumulative payouts: the second withdrawal crosses the line", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02"]);
		deposit(log, "A01", 3);
		deposit(log, "A02", 3);
		withdraw(log, "A01", "A01", 2);
		const second = withdraw(log, "A01", "A01", 2);
		expect(detect(log).map((beat) => beat.seq)).toEqual([second]);
	});
});

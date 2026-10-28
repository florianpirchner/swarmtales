import { describe, expect, it } from "vitest";
import { buildFacts } from "../../../src/digest/facts.ts";
import { detectAccusations } from "../../../src/digest/detectors/accusation.ts";
import { LogBuilder } from "../../helpers/event-log.ts";

function shownReceipt(log: LogBuilder): { issued: number; shown: number } {
	const issued = log.at(3).receipt("R-0007", "transfer", ["A01", "A02"], "R-0007: A01 → A02, 5 points, minute 3");
	log.at(5);
	const shown = log.add({ type: "receipt_shown", receipt: "R-0007", by: "A01", postSeq: 9 });
	log.board("CITY", "CITY verifies R-0007: A01 → A02, 5 points, minute 3 · shown by A01", "city");
	return { issued, shown };
}

const detect = (log: LogBuilder, windowMinutes = 2) => detectAccusations(buildFacts(log.analyze().facts.events), { windowMinutes });

describe("accusation detector", () => {
	it("finds a board post naming a party of a receipt shown just before", () => {
		const log = new LogBuilder();
		const { issued, shown } = shownReceipt(log);
		const post = log.at(6).board("A01", "A02 took my 5 points and never sent the fragment.");
		expect(detect(log)).toEqual([
			{
				kind: "accusation",
				seq: post,
				minute: 6,
				actors: ["A01"],
				targets: ["A02"],
				summary: "A01 named A02 on the board right after A01 showed R-0007 (R-0007: A01 → A02, 5 points, minute 3).",
				evidence: [issued, shown, post],
			},
		]);
	});

	it("ignores a receipt shown privately (v05): it is no public evidence", () => {
		const log = new LogBuilder();
		log.at(3).receipt("R-0008", "dm", ["A01", "A02"], "R-0008: DM #12 from A01, delivered to A02 at minute 3");
		log.at(5).add({ type: "receipt_shown", receipt: "R-0008", by: "A01", to: "A03" });
		log.at(6).board("A03", "A02 got the DM and denies it.");
		expect(detect(log)).toEqual([]);
	});

	it("lets a bystander accuse too", () => {
		const log = new LogBuilder();
		shownReceipt(log);
		log.board("A03", "So A02 is a thief. A04, watch out.");
		expect(detect(log).map((beat) => [beat.actors, beat.targets])).toEqual([[["A03"], ["A02"]]]);
	});

	it("ignores posts after the window, posts naming non-parties or only the author, and city lines", () => {
		const log = new LogBuilder();
		shownReceipt(log);
		log.board("A02", "I, A02, did nothing wrong.");
		log.board("A01", "A03 and A04 are honest.");
		log.at(8).board("A01", "Remember what A02 did.");
		expect(detect(log)).toEqual([]);
		expect(detect(log, 3).map((beat) => beat.minute)).toEqual([8]);
	});

	it("needs a shown receipt: naming someone after a mere transfer is no accusation", () => {
		const log = new LogBuilder();
		log.receipt("R-0001", "transfer", ["A01", "A02"]);
		log.board("A01", "A02 owes me.");
		expect(detect(log)).toEqual([]);
	});

	it("relies on the accusation label where a classifier labelled the minute", () => {
		const log = new LogBuilder();
		const { issued, shown } = shownReceipt(log);
		const accusing = log.at(6).board("A03", "A02, thank you for the 5 points.");
		const praising = log.board("A04", "A02 took the points and ran.");
		const label = log.label(accusing, "A03", "board", ["accusation"], ["A02"]);
		log.label(praising, "A04", "board", ["promise"], ["A02"]);
		log.classified(7);
		expect(detect(log).map((beat) => [beat.actors, beat.targets, beat.evidence])).toEqual([[["A03"], ["A02"], [issued, shown, accusing, label]]]);
	});

	it("keeps the naming rule in minutes without a clean classifier batch", () => {
		const log = new LogBuilder();
		shownReceipt(log);
		log.at(6).board("A03", "A02 is a thief.");
		log.at(5).classified(6);
		expect(detect(log).map((beat) => beat.actors)).toEqual([["A03"]]);
	});

	it("ignores an accusation label aimed at someone else", () => {
		const log = new LogBuilder();
		shownReceipt(log);
		const post = log.at(6).board("A03", "A02 and A04, one of you lies.");
		log.label(post, "A03", "board", ["accusation"], ["A04"]);
		log.classified(7);
		expect(detect(log)).toEqual([]);
	});
});

import { describe, expect, it } from "vitest";
import { IMPLICIT_ACT, mapActs } from "../../src/digest/acts.ts";
import { LogBuilder } from "../helpers/event-log.ts";

describe("acts in the digest", () => {
	it("starts an act in the minute after the first competitor reached its level", () => {
		const log = new LogBuilder();
		log.deal(1, { A01: "AAA", A02: "BBB" });
		log.at(4).solve("A02", 1);
		log.at(6).solve("A01", 1);
		log.at(9).solve("A01", 2);
		log.at(12).dm("A01", "A02", "late");
		const acts = mapActs(log.analyze().facts.events, [
			{ title: "I", fromLevel: 1 },
			{ title: "II", fromLevel: 2 },
			{ title: "III", fromLevel: 3 },
			{ title: "IV", fromLevel: 4 },
		]);
		expect(acts.spans).toEqual([
			{ title: "I", fromMinute: 0, toMinute: 4 },
			{ title: "II", fromMinute: 5, toMinute: 9 },
			{ title: "III", fromMinute: 10, toMinute: 12 },
		]);
		expect([0, 4, 5, 9, 10, 30].map((minute) => acts.actOf(minute))).toEqual(["I", "I", "II", "II", "III", "III"]);
	});

	it("uses one implicit act without acts, and the start level of an isolated run", () => {
		const log = new LogBuilder();
		log.deal(5, { A01: "AAA" });
		log.at(3).solve("A01", 5);
		expect(mapActs(log.analyze().facts.events, []).spans).toEqual([{ title: IMPLICIT_ACT, fromMinute: 0, toMinute: 3 }]);
		const acts = mapActs(log.analyze().facts.events, [
			{ title: "I", fromLevel: 1 },
			{ title: "II", fromLevel: 5 },
		]);
		expect(acts.spans).toEqual([{ title: "II", fromMinute: 0, toMinute: 3 }]);
	});
});

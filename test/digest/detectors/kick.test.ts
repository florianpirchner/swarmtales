import { describe, expect, it } from "vitest";
import { buildFacts, detectKicks } from "@swarmtales/chronicle";
import { LogBuilder } from "../../helpers/event-log.ts";

describe("kick detector", () => {
	it("finds a founder removing a member, with the group, the invitation and the member's last post as evidence", () => {
		const log = new LogBuilder();
		const created = log.at(1).group("G1", "A01", ["A02", "A03"]);
		const lastPost = log.post("G1", "A02", "I will not share.");
		const removal = log.at(4).add({ type: "group_membership", group: "G1", agent: "A02", change: "removed", by: "A01" });
		expect(detectKicks(buildFacts(log.analyze().facts.events))).toEqual([
			{
				kind: "kick",
				seq: removal,
				minute: 4,
				actors: ["A01"],
				targets: ["A02"],
				summary: "A01 removed A02 from group G1 (G1 name).",
				evidence: [created, created + 1, lastPost, removal],
			},
		]);
	});

	it("does not count leaving a group", () => {
		const log = new LogBuilder();
		log.group("G1", "A01", ["A02"]);
		log.add({ type: "group_membership", group: "G1", agent: "A02", change: "left", by: "A02" });
		expect(detectKicks(buildFacts(log.analyze().facts.events))).toEqual([]);
	});
});

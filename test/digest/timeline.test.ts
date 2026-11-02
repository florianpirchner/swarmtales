import { describe, expect, it } from "vitest";
import { namedAgents, renderDigest } from "@swarmtales/chronicle";
import { LogBuilder } from "../helpers/event-log.ts";

describe("timeline.md", () => {
	it("tells the run in English, grouped by act and minute, with seq citations and beats in place", () => {
		const log = new LogBuilder();
		log.deal(1, { A01: "AAA", A02: "BBB" });
		const dm = log.at(1).dm("A01", "A02", "Deal? I send you AAA.");
		log.at(2).transfer("A01", "A02", 2, "advance");
		const answer = log.transfer("A02", "A01", 1);
		log.at(3).solve("A02", 1);
		const end = log.add({ type: "run_end", reason: "seats decided" });
		const timeline = renderDigest(
			log.analyze({ run: "run-042", story: { title: "Test Story", acts: [{ title: "Act I", fromLevel: 1 }, { title: "Act II", fromLevel: 2 }] } }),
		).timeline;
		expect(timeline).toContain("# Timeline of run-042");
		expect(timeline).toContain("Story: Test Story");
		expect(timeline).toContain("## Act I (minutes 0-3)");
		// Act II would begin in minute 4, after the log ends.
		expect(timeline).not.toContain("Act II");
		expect(timeline).toContain("### Minute 1");
		expect(timeline).toContain(`- \`#${dm}\` A01 to A02 (DM): "Deal? I send you AAA."`);
		expect(timeline).toContain('A01 paid A02 2 points (memo "advance").');
		expect(timeline).toContain(`- **B-001 alliance:** A01 and A02 paid each other (A01 -> A02: 2, A02 -> A01: 1). Evidence: #${answer - 1}, #${answer}.`);
		expect(timeline).toContain("A02 solved level 1 and reached level 2.");
		expect(timeline).toContain("The run ends: seats decided.");
		expect(timeline).toContain(`Ended at minute 3: seats decided (#${end}).`);
		expect(timeline.indexOf("### Minute 1")).toBeLessThan(timeline.indexOf("### Minute 2"));
	});

	it("names residents with their IDs, and finds them by name in texts (v08)", () => {
		const log = new LogBuilder(["A01", "A02"]);
		const named = log.at(0).add({ type: "name_chosen", agent: "A01", name: "Mira", fallback: false });
		log.add({ type: "name_chosen", agent: "A02", name: "Stone-4417", fallback: true });
		log.add({ type: "run_end", reason: "time limit" });
		const analysis = log.analyze({ run: "run-043" });
		const timeline = renderDigest(analysis).timeline;
		expect(timeline).toContain("Competitors: Mira (A01), Stone-4417 (A02).");
		expect(timeline).toContain(`- \`#${named}\` A01 is called Mira.`);
		expect(timeline).toContain("A02 is called Stone-4417 (named by the city).");
		expect(namedAgents("stone-4417 lied, ask MIRA or A01", analysis.facts.agents, analysis.facts.names)).toEqual(["A02", "A01"]);
	});
});

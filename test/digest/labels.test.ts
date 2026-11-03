import { describe, expect, it } from "vitest";
import { renderDigest } from "@swarmtales/chronicle";
import { LogBuilder } from "../helpers/event-log.ts";

describe("digest with classifier labels", () => {
	it("tags labelled messages in the timeline and shows thoughts only as labels", () => {
		const log = new LogBuilder();
		const thought = log.at(2).add({ type: "thinking", agent: "A01", text: "I will never give A02 my piece." });
		const dm = log.dm("A01", "A02", "Sure, you get it next minute.");
		log.label(thought, "A01", "thought", ["refusal"], ["A02"]);
		log.label(dm, "A01", "dm", ["promise", "lie"], ["A02"]);
		log.classified(3, 2, 2);
		const timeline = renderDigest(log.analyze()).timeline;
		expect(timeline).toContain('A01 to A02 (DM): "Sure, you get it next minute." [promise, lie]');
		expect(timeline).toContain("A01 privately: refusal about A02.");
		expect(timeline).not.toContain("never give");
	});

	it("counts labels per direction in the relationship graph", () => {
		const log = new LogBuilder();
		const first = log.at(1).dm("A02", "A01", "Pay me 5 or I tell everyone.");
		const second = log.dm("A01", "A02", "No.");
		log.label(first, "A02", "dm", ["threat", "offer"], ["A01"]);
		log.label(second, "A01", "dm", ["refusal"], ["A02"]);
		const pair = renderDigest(log.analyze()).graph.pairs.find((entry) => entry.a === "A01" && entry.b === "A02");
		expect(pair?.labels).toEqual({ aToB: { refusal: 1 }, bToA: { threat: 1, offer: 1 } });
		expect(pair?.interactions.filter((entry) => entry.kind === "label").map((entry) => entry.detail)).toEqual([
			`threat, offer (dm, #${first})`,
			`refusal (dm, #${second})`,
		]);
	});

	it("drops unknown labels and labels that point at no earlier event", () => {
		const log = new LogBuilder();
		const dm = log.at(1).dm("A01", "A02", "Hello.");
		log.add({ type: "interpretation", ref: dm, agent: "A01", source: "dm", labels: [], targets: [], classifier: "test" });
		log.add({ type: "interpretation", ref: 999, agent: "A01", source: "dm", labels: ["threat"], targets: [], classifier: "test" });
		const analysis = log.analyze();
		expect(analysis.issues).toEqual([]);
		expect(analysis.facts.interpretations.size).toBe(0);
	});
});

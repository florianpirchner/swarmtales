/** The weaver's changes in the digest: the timeline, the `fateShift` beat and a log that carries less. */
import { describe, expect, it } from "vitest";
import { analyzeLog, renderDigest } from "../../src/digest/digest.ts";
import { detectFateShifts } from "../../src/digest/detectors/fate.ts";
import { buildFacts } from "../../src/digest/facts.ts";
import { LogBuilder } from "../helpers/event-log.ts";

function changedLog(): { readonly log: LogBuilder; readonly blame: number; readonly soft: number; readonly hard: number; readonly act: number } {
	const log = new LogBuilder();
	const blame = log.at(2).add({ type: "blame", caller: "A01", accused: "A02", dm: 4, claim: 9, outcome: "upheld", payer: "A02", penalty: 5, post: 12 });
	const soft = log.add({ type: "fate_shift", agent: "A02", kind: "soft", text: "You flinch when A01 writes.", reason: "branded a liar", evidence: [blame], triggers: ["blame"] });
	const hard = log.at(3).add({ type: "fate_shift", agent: "A02", kind: "hard", text: "You trust no one.", reason: "branded a liar twice", evidence: [blame], triggers: ["blame"] });
	const act = log.at(9).add({ type: "fate_shift", agent: "A02", kind: "act", text: "You judge for yourself now.", reason: "Act I made a cynic of you", evidence: [soft, hard], triggers: ["act_end"] });
	return { log, blame, soft, hard, act };
}

describe("the weaver in the digest", () => {
	it("tells every change in the timeline", () => {
		const { log, soft, act } = changedLog();
		const timeline = renderDigest(log.analyze({ run: "run-050" })).timeline;
		expect(timeline).toContain(`- \`#${String(soft)}\` A02 hears an inner voice: "You flinch when A01 writes." (branded a liar).`);
		expect(timeline).toContain(`- \`#${String(act)}\` A02 begins the next act changed: "You judge for yourself now." (Act I made a cynic of you).`);
	});

	it("makes a fateShift beat of a hard change and of an act's end, never of an inner voice", () => {
		const { log, blame, soft, hard, act } = changedLog();
		const beats = detectFateShifts(buildFacts(log.analyze().facts.events));
		expect(beats.map((beat) => [beat.kind, beat.actors, beat.summary, beat.evidence])).toEqual([
			["fateShift", ["A02"], "A02 changes: branded a liar twice", [blame, hard]],
			["fateShift", ["A02"], "A02 begins the next act changed: Act I made a cynic of you", [soft, hard, act]],
		]);
		expect(log.analyze().beats.filter((beat) => beat.kind === "fateShift")).toHaveLength(2);
	});

	it("reads a change without reason or evidence", () => {
		const log = new LogBuilder();
		log.events.push({ type: "fate_shift", seq: 2, minute: 1, agent: "A02", kind: "hard", text: "You trust no one.", reason: "", evidence: [], triggers: [] });
		const analysis = analyzeWithout(log, ["reason", "evidence"]);
		expect(analysis.issues).toEqual([]);
		expect(analysis.beats.map((beat) => beat.summary)).toEqual(["A02 changes: You trust no one."]);
	});
});

/** The log as JSONL with some fields of every `fate_shift` left out. */
function analyzeWithout(log: LogBuilder, fields: readonly string[]) {
	const lines = log.jsonl().split("\n").map((line) => {
		if (!line.includes('"fate_shift"')) return line;
		const value: unknown = JSON.parse(line);
		if (typeof value !== "object" || value === null) return line;
		return JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key))));
	});
	return analyzeLog("run-test", lines.join("\n"));
}

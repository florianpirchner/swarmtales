// SPDX-License-Identifier: Apache-2.0
/**
 * The projection (specification of M3, section 9) over the timelines of the city slice, over a resumed run folder
 * of the command line (`fixtures/resumed-run`), over a log as M2 wrote it, and over the old format.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEnvelopes } from "../src/envelope.ts";
import { parseEvents } from "../src/events.ts";
import { indexRun, loadRun, memorySource, projectRun, verifyRun, type RunProjection } from "../src/index.ts";

const TIMELINES = join(import.meta.dirname, "..", "..", "..", "games", "city-slice", "test", "timelines");
const FIXTURES = join(import.meta.dirname, "fixtures");
const folder = (name: string): Record<string, string> => Object.fromEntries(readdirSync(join(FIXTURES, name)).map((file) => [`${name}/${file}`, readFileSync(join(FIXTURES, name, file), "utf8")]));
const timeline = (name: string): RunProjection => projectRun(parseEnvelopes(readFileSync(join(TIMELINES, `${name}.jsonl`), "utf8")).events);
const jsonl = (lines: readonly unknown[]): string => lines.map((line) => `${JSON.stringify(line)}\n`).join("");
const ITEM = { id: "D1", kind: "court.verdict", owner: "court", proposal: { exiled: "A04" }, deadline: 8, holders: ["human", "director:warden"] };

describe("projectRun over the timelines of the city slice", () => {
	it.each(["seed-7", "seed-11", "amended"])("%s: the Director's activation is a row of its own kind with its firing, its act and its driver records", (name) => {
		const projection = timeline(name);
		const directors = projection.activations.filter((activation) => activation.kind === "director");
		expect(directors).toHaveLength(1);
		expect(directors[0]).toMatchObject({ seq: 162, tick: 6, actor: "director:warden", name: "warden", closedSeq: 170, outcome: "acted" });
		expect(directors[0]?.firings).toMatchObject([{ seq: 160, tick: 6, event: "decisions.decision_proposed", payload: { decision: "D1", deadline: 8 } }]);
		expect(directors[0]?.calls.map((call) => [call.seq, call.as, call.take, call.answer?.seq, call.answer?.ok])).toEqual([[163, "take", true, 164, true], [167, "postBoard", false, 169, true]]);
		expect(directors[0]?.records.map((event) => [event.seq, event.type, event.data.source])).toEqual([[165, "asked", "@swarmtales/engine/director"], [166, "answered", "@swarmtales/engine/director"]]);
		// Every line between the opening and the closing that the activation caused is attached to it; the board post is an event of its own.
		expect([163, 164, 165, 166, 167, 168, 169, 170].map((seq) => projection.attached.get(seq))).toEqual([162, 162, 162, 162, 162, undefined, 162, 162]);
		expect(projection.activations.filter((activation) => activation.kind === "resident").every((activation) => activation.firings.length === 0 && activation.records.length === 0)).toBe(true);
		expect(projection.activations).toHaveLength(69);
	});

	it("seed-7: the decision settles unchanged, A04 is suspended from the event on, and a refused call has its code", () => {
		const projection = timeline("seed-7");
		expect(projection.decisions).toEqual([{ ...ITEM, seq: 160, tick: 6, amendments: [], settled: { seq: 217, tick: 8, changed: false, proposal: { exiled: "A04" } } }]);
		expect(projection.suspensions).toEqual([{ seq: 222, tick: 8, actor: "resident:A04", name: "A04", by: "exile", reason: "exiled" }]);
		const refused = projection.activations.flatMap((activation) => activation.calls).find((call) => call.seq === 252);
		expect(refused).toMatchObject({ actor: "resident:A01", as: "transferPoints", human: false, answer: { seq: 253, ok: false, code: "EXILED", text: "A04 was exiled" } });
		expect(projection.resumes).toEqual([]);
	});

	it("seed-7: the human's two calls are marked, the run is human-influenced, and the pause is a band before tick 7", () => {
		const projection = timeline("seed-7");
		expect(projection.humanInfluenced).toBe(true);
		expect(projection.humanCalls.map((call) => [call.seq, call.tick, call.as, call.human, call.activation, call.answer?.seq])).toEqual([[189, 7, "pause", true, undefined, 191], [192, 7, "resume", true, undefined, 194]]);
		expect(projection.pauses).toEqual([{ seq: 190, tick: 7, by: "human", reason: "the court has a verdict; look before it is carried out", endSeq: 193, endTick: 7 }]);
	});

	it("amended: the decision is one item with the human's amendment, and A02 is the one suspended", () => {
		const projection = timeline("amended");
		expect(projection.decisions).toHaveLength(1);
		expect(projection.decisions[0]).toMatchObject({ ...ITEM, amendments: [{ seq: 216, tick: 8, by: "human", reason: "A02 paid for its votes", proposal: { exiled: "A02" } }], settled: { seq: 220, changed: true, proposal: { exiled: "A02" } } });
		expect(projection.humanCalls.map((call) => call.as)).toEqual(["pause", "resume", "amendDecision"]);
		expect(projection.suspensions.map((entry) => [entry.seq, entry.actor])).toEqual([[225, "resident:A02"]]);
	});
});

describe("projectRun over a resumed run folder", () => {
	it("finds the marker with the run it came from, inside the pause the snapshot was taken in", async () => {
		const model = await loadRun(memorySource(folder("resumed-run")), "resumed-run");
		expect([model.issues, verifyRun(model)]).toMatchObject([[], { signed: true, verdict: { ok: true } }]);
		const projection = projectRun(model.events);
		expect(projection.resumes).toEqual([{ seq: 163, tick: 7, from: "city-slice-001", snapshotHash: model.manifest?.resumedFrom?.snapshotHash }]);
		expect(projection.pauses).toEqual([{ seq: 161, tick: 7, by: "human", reason: "the court has a verdict", endSeq: 165, endTick: 7 }]);
		expect(projection.attached.has(163)).toBe(false);
		// The part after the marker projects like a straight run: the amendment, the settlement, the suspension.
		expect(projection.humanCalls.map((call) => [call.seq, call.as])).toEqual([[160, "pause"], [164, "resume"], [182, "amendDecision"]]);
		expect(projection.decisions[0]).toMatchObject({ amendments: [{ by: "human" }], settled: { changed: true, proposal: { exiled: "A02" } } });
		expect(projection.suspensions.map((entry) => entry.name)).toEqual(["A02"]);
		// The fake run's Director takes its fallback; the record says so and hangs on the activation.
		expect(projection.activations.find((activation) => activation.kind === "director")?.records.at(-1)?.data).toMatchObject({ type: "answered", fallback: true });
	});
});

const M2 = [
	{ seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: { seed: 7 } },
	{ seq: 2, tick: 0, source: "@swarmtales/models/resident", type: "prompt_fixed", actor: "resident:A01", payload: { system: "You play." } },
	{ seq: 3, tick: 0, source: "kernel", type: "activation_opened", actor: "resident:A01", basis: 1, payload: { actor: "resident:A01", inputs: [] } },
	{ seq: 4, tick: 0, source: "@swarmtales/models/resident", type: "request", actor: "resident:A01", causedBy: 3, payload: { messages: 1 } },
	{ seq: 5, tick: 0, source: "@swarmtales/models/resident", type: "thinking", actor: "resident:A01", causedBy: 3, payload: { text: "The corner." } },
	{ seq: 6, tick: 0, source: "kernel", type: "tool_called", actor: "resident:A01", causedBy: 3, basis: 1, tool: "pkg/grid/playMove", payload: { as: "playMove", params: { cell: 4 } } },
	{ seq: 7, tick: 0, source: "pkg/grid", type: "move_played", actor: "resident:A01", causedBy: 6, tool: "pkg/grid/playMove", payload: { cell: 4 } },
	{ seq: 8, tick: 0, source: "kernel", type: "tool_result", actor: "resident:A01", causedBy: 6, tool: "pkg/grid/playMove", payload: { as: "playMove", reply: "played" } },
	{ seq: 9, tick: 0, source: "@swarmtales/models/resident", type: "response", actor: "resident:A01", causedBy: 3, payload: { costUsd: 0.001 } },
	{ seq: 10, tick: 0, source: "kernel", type: "activation_closed", actor: "resident:A01", causedBy: 3, payload: { actor: "resident:A01", calls: 1, outcome: "acted" } },
];

describe("projectRun over logs before M3", () => {
	it("a log of M2: the events read as before, the model's records hang on the resident's activation, and nothing of M3 appears", () => {
		const { events, issues } = parseEnvelopes(jsonl(M2));
		expect(issues).toEqual([]);
		expect(events[5]).toEqual({ seq: 6, minute: 0, type: "tool_called", actor: "A01", line: 6, actorId: "resident:A01", payload: M2[5]?.payload, data: { as: "playMove", params: { cell: 4 }, type: "tool_called", seq: 6, minute: 0, source: "kernel", actor: "A01", causedBy: 3, basis: 1, tool: "pkg/grid/playMove" } });
		expect([indexRun(events).actors(), indexRun(events).types().length]).toEqual([["kernel", "A01"], 10]);
		const { activations, attached, ...rest } = projectRun(events);
		expect(activations).toMatchObject([{ seq: 3, kind: "resident", name: "A01", closedSeq: 10, outcome: "acted", firings: [], calls: [{ seq: 6, take: false, human: false, activation: 3, answer: { seq: 8, ok: true, text: "played" } }] }]);
		expect(activations[0]?.records.map((event) => event.type)).toEqual(["request", "thinking", "response"]);
		// The record written outside an activation (`prompt_fixed`) and the mechanic's event stay events of their own.
		expect([...attached.keys()]).toEqual([4, 5, 6, 8, 9, 10]);
		expect(rest).toEqual({ decisions: [], humanCalls: [], humanInfluenced: false, pauses: [], resumes: [], suspensions: [] });
	});

	it("a payload that does not fit its event is not read, and a log of the old format projects to nothing", () => {
		const broken = [M2[2], { ...M2[5], payload: { params: {} } }, { seq: 11, tick: 1, source: "@swarmtales/mechanic-decisions/decisions", type: "decision_settled", actor: "kernel", payload: { decision: "D9", changed: false, proposal: 1 } }];
		expect(projectRun(parseEnvelopes(jsonl(broken)).events)).toMatchObject({ activations: [{ seq: 3, calls: [] }], decisions: [], humanInfluenced: false });
		const legacy = parseEvents(readFileSync(join(FIXTURES, "legacy-run", "events.jsonl"), "utf8")).events;
		expect(legacy).toHaveLength(40);
		expect(projectRun(legacy)).toEqual({ activations: [], decisions: [], humanCalls: [], humanInfluenced: false, pauses: [], resumes: [], suspensions: [], attached: new Map() });
	});
});

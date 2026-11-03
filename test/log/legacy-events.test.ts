/**
 * The legacy event adapter (packages/chronicle/src/log/legacy-events.ts): every golden log read
 * into envelopes and written back gives the same bytes; a run of the new core is written in the
 * legacy shape with core events dropped or translated and `seq` counted over what is written.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { envelopeFromLegacy, LEGACY_EVENT_OWNERS, LegacyEventAdapter, legacyLine, legacySink, toRecorded, type LegacyEvent } from "@swarmtales/chronicle";
import type { EventEnvelope } from "@swarmtales/contracts";
import { createHost } from "@swarmtales/kernel";
import { GOLDEN_DIR } from "../helpers/golden.ts";
import { proofAgent, proofOptions } from "../host/proof/story.ts";

const GOLDEN = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"];

describe("the legacy event adapter", () => {
	it.each(GOLDEN)("writes %s back byte for byte from envelopes", (name) => {
		const text = readFileSync(`${GOLDEN_DIR}/${name}.events.jsonl`, "utf8");
		const lines = text.split("\n").filter((line) => line.length > 0);
		const adapter = new LegacyEventAdapter();
		const written = lines.flatMap((line) => adapter.write(envelopeFromLegacy(JSON.parse(line))));
		expect(written).toHaveLength(lines.length);
		expect(`${written.map((event) => legacyLine(event)).join("\n")}\n`).toBe(text);
		// Every line is an event the old sinks take.
		expect(() => written.map(toRecorded)).not.toThrow();
		// The owners are what the carve plan says; no golden event is left to the app by accident.
		const owners = new Set(written.map((event) => LEGACY_EVENT_OWNERS[toRecorded(event).type]));
		expect(owners.has("core")).toBe(name === "whispers-f10-grudge");
	});

	it("writes a run of the new core in the legacy shape", async () => {
		const host = createHost(proofOptions());
		const written: LegacyEvent[] = [];
		const adapter = new LegacyEventAdapter();
		const envelopes: EventEnvelope[] = [];
		host.subscribe((event) => {
			envelopes.push(event);
			written.push(...adapter.write(event));
		});
		host.start();
		await host.run(proofAgent());
		expect(written.map((event) => event.seq)).toEqual(written.map((_, index) => index + 1));
		const types = new Set(written.map((event) => event.type));
		for (const core of ["run_started", "minute_started", "turn_started", "tool_called", "tool_refused", "service_called", "pass_started"]) expect(types.has(core)).toBe(false);
		expect(written[0]).toEqual({ type: "round_start", round: 1, seq: 1, minute: 0 });
		expect(Object.keys(written[1] ?? {})).toEqual(["type", "round", "pass", "order", "blocks", "seq", "minute"]);
		expect(written[1]).toMatchObject({ type: "pass_start", round: 1, pass: 1, seq: 2, minute: 0 });
		const dm = envelopes.find((event) => event.type === "dm_sent");
		const legacyDm = written.find((event) => event.type === "dm_sent");
		expect(dm?.payload).toBeDefined();
		expect(legacyLine(legacyDm ?? { type: "none", seq: 0, minute: 0 })).toBe(JSON.stringify({ type: "dm_sent", ...Object(dm?.payload), seq: legacyDm?.seq, minute: dm?.minute }));
		expect(written.filter((event) => event.type === "round_start")).toHaveLength(6);
	});

	it("translates skipped turns and guard verdicts, and continues a resumed numbering", () => {
		const adapter = new LegacyEventAdapter({ lastSeq: 41 });
		const skipped: EventEnvelope = { seq: 7, minute: 3, type: "turn_skipped", source: "core", actor: "host", payload: { resident: "A02", pass: 2, block: 1 } };
		const verdict: EventEnvelope = {
			seq: 8,
			minute: 3,
			type: "guard_verdict",
			source: "core",
			actor: "resident:A04",
			causedBy: 6,
			payload: { tool: "postBoard", rule: "no-fragments", allowed: false, reason: "carries a code", by: "check" },
		};
		expect([...adapter.write(skipped), ...adapter.write(verdict)].map((event) => legacyLine(event))).toEqual([
			'{"type":"turn_skipped","agent":"A02","pass":2,"block":1,"seq":42,"minute":3}',
			'{"type":"guard_verdict","tool":"postBoard","agent":"A04","rule":"no-fragments","allowed":false,"reason":"carries a code","by":"check","seq":43,"minute":3}',
		]);
		expect(adapter.write({ seq: 9, minute: 3, type: "job_ran", source: "core", actor: "host", payload: { owner: "x", job: "y" } })).toEqual([]);
		expect(() => adapter.write({ seq: 10, minute: 3, type: "said", source: "talk", actor: "host", payload: { seq: 1 } })).toThrow(/field "seq"/);
	});

	it("feeds today's sinks through legacySink", () => {
		const seen: string[] = [];
		const sink = legacySink((event) => seen.push(event.type));
		sink({ seq: 1, minute: 0, type: "notice", source: "channels", actor: "host", payload: { to: "A01", author: "CITY", text: "hello" } });
		expect(seen).toEqual(["notice"]);
		expect(() => {
			sink({ seq: 2, minute: 0, type: "notice", source: "channels", actor: "host", payload: { to: 3 } });
		}).toThrow(/does not match/);
	});
});

describe("the legacy adapter's seq references (step 18, C1 request 4)", () => {
	const at = (seq: number, source: string, type: string, payload: Readonly<Record<string, unknown>>): EventEnvelope => ({ seq, minute: 1, type, source, actor: "host", payload });

	it("points interpretation.ref and fate_shift.evidence at the legacy lines, across dropped core events", () => {
		const adapter = new LegacyEventAdapter();
		const written = [
			at(1, "core", "tool_called", { tool: "postBoard", params: {} }),
			at(2, "channels", "board_post", { agent: "A01", text: "hello" }),
			at(3, "core", "tool_called", { tool: "sendDm", params: {} }),
			at(4, "core", "service_called", { service: "x" }),
			at(5, "channels", "dm_sent", { from: "A02", to: "A01", text: "hi" }),
			at(6, "classifier", "interpretation", { ref: 5, agent: "A02", source: "dm", labels: ["threat"], targets: ["A01"], model: "m" }),
			at(7, "weaver", "fate_shift", { agent: "A01", kind: "soft", text: "t", reason: "r", evidence: [2, 5, 4, 99], triggers: ["accusation"] }),
		].flatMap((event) => adapter.write(event));
		expect(written.map((event) => [event.type, event.seq])).toEqual([
			["board_post", 1],
			["dm_sent", 2],
			["interpretation", 3],
			["fate_shift", 4],
		]);
		expect(written[2]).toMatchObject({ ref: 2 });
		// A dropped envelope points at the last line before it; a seq the adapter never saw is kept.
		expect(written[3]).toMatchObject({ evidence: [1, 2, 1, 99] });
		expect(Object.keys(written[2] ?? {})).toEqual(["type", "ref", "agent", "source", "labels", "targets", "model", "seq", "minute"]);
		expect(adapter.legacySeqOf(5)).toBe(2);
		expect(adapter.legacySeqOf(42)).toBeUndefined();
	});

	it("reads interpretation and fate_shift lines back as the overseers' events", () => {
		const line = { type: "fate_shift", agent: "A01", kind: "soft", text: "t", reason: "r", evidence: [1], triggers: ["accusation"], seq: 2, minute: 1 };
		expect(envelopeFromLegacy(line).source).toBe("weaver");
		expect(envelopeFromLegacy({ type: "interpretation_round", round: 1, statements: 0, seq: 1, minute: 0 }).source).toBe("classifier");
	});
});

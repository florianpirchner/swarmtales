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

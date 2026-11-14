// SPDX-License-Identifier: Apache-2.0
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { EnvelopeSchema, SwtError, type Envelope } from "@swarmtales/contracts";
import { createLog } from "../src/log.ts";

const SRC = "@swarmtales/sample/grid";
const A01 = "resident:A01";

/** A log at tick 3 with a sink that records the types it was given. */
function setup(audienceOf: (source: string, type: string) => readonly string[] | undefined = () => undefined, prefix?: readonly Envelope[]) {
	const log = createLog(() => 3, audienceOf, prefix);
	const trace: string[] = [];
	log.addSink({ write: (event) => trace.push(`sink:${event.type}`) });
	return { log, trace };
}

function codeOf(run: () => unknown): string | undefined {
	try {
		run();
	} catch (thrown) {
		return thrown instanceof SwtError ? thrown.code : `not an SwtError: ${String(thrown)}`;
	}
	return undefined;
}

describe("the envelope", () => {
	it("takes actor, causedBy and tool from the top frame, and `kernel` outside any", () => {
		const { log } = setup();
		expect(log.frame()).toEqual({ actor: "kernel" });
		const first = log.emit("kernel", "run_started", { seed: 1 });
		expect(first).toEqual({ seq: 1, tick: 3, source: "kernel", type: "run_started", actor: "kernel", payload: { seed: 1 } });
		const second = log.run({ actor: A01, causedBy: 1, tool: "grid.place" }, () => {
			expect(log.frame()).toEqual({ actor: A01, causedBy: 1, tool: "grid.place" });
			return log.run({ actor: A01, causedBy: 1 }, () => log.emit(SRC, "placed", null, { basis: 1 }));
		});
		expect(second).toEqual({ seq: 2, tick: 3, source: SRC, type: "placed", actor: A01, causedBy: 1, basis: 1, payload: null });
		expect(log.run({ actor: A01, tool: "grid.place" }, () => log.emit(SRC, "placed", null)).tool).toBe("grid.place");
		expect(log.all().every((event) => Check(EnvelopeSchema, event))).toBe(true);
		expect(Object.keys(second)).toEqual(["seq", "tick", "source", "type", "actor", "causedBy", "basis", "payload"]);
	});

	it("writes an audience only when one is set; the emitter's wins over the default", () => {
		const { log } = setup((source, type) => (source === SRC && type === "hint" ? ["human"] : undefined));
		expect("audience" in log.emit(SRC, "placed", null)).toBe(false);
		expect(log.emit(SRC, "hint", null).audience).toEqual(["human"]);
		expect(log.emit(SRC, "hint", null, { audience: ["a", "b"] }).audience).toEqual(["a", "b"]);
	});

	it("reads the log: length, since, ofType; a prefix is kept and not delivered again", () => {
		const old: Envelope = { seq: 1, tick: 0, source: SRC, type: "placed", actor: "kernel", payload: null };
		const { log, trace } = setup(undefined, [old]);
		log.listen(SRC, "placed", () => trace.push("heard"));
		expect(trace).toEqual([]);
		expect(log.emit("kernel", "tick_started", null).seq).toBe(2);
		expect(log.length).toBe(2);
		expect(log.since(1).map((event) => event.seq)).toEqual([2]);
		expect(log.ofType(SRC, "placed")).toEqual([old]);
		expect(codeOf(() => createLog(() => 0, () => undefined, [{ ...old, seq: 2 }]))).toBe("SWT-R002");
	});
});

describe("delivery", () => {
	it("delivers at once outside a frame: the listeners in the order they were added, then the sinks", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", () => trace.push("first"));
		log.listen(SRC, "other", () => trace.push("wrong type"));
		log.listen("kernel", "placed", () => trace.push("wrong source"));
		log.listen(SRC, "placed", () => trace.push("second"));
		log.emit(SRC, "placed", null);
		expect(trace).toEqual(["first", "second", "sink:placed"]);
	});

	it("delivers nothing when a nested frame returns, and everything when the outermost returns", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", () => trace.push("heard"));
		log.run({ actor: A01 }, () => {
			log.run({ actor: A01, causedBy: 1 }, () => log.emit(SRC, "placed", null));
			trace.push("inner returned");
			log.emit(SRC, "placed", null);
			trace.push("outer ends");
		});
		expect(trace).toEqual(["inner returned", "outer ends", "heard", "sink:placed", "heard", "sink:placed"]);
	});

	it("runs a listener in the frame of its event; what it emits queues behind", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", (event) => {
			expect(log.frame()).toEqual({ actor: A01, causedBy: event.seq, tool: "grid.place" });
			log.emit(SRC, "won", null);
			trace.push("first done");
		});
		log.listen(SRC, "placed", () => trace.push("second"));
		log.listen(SRC, "won", () => trace.push("heard won"));
		log.run({ actor: A01, tool: "grid.place" }, () => {
			log.emit(SRC, "placed", null);
			log.emit(SRC, "counted", null);
		});
		expect(trace).toEqual(["first done", "second", "sink:placed", "sink:counted", "heard won", "sink:won"]);
		expect(log.all().map((event) => [event.type, event.actor, event.causedBy, event.tool])).toEqual([
			["placed", A01, undefined, "grid.place"],
			["counted", A01, undefined, "grid.place"],
			// The reaction is a consequence of the call the event was written in (2.2).
			["won", A01, 1, "grid.place"],
		]);
	});

	it("delivers what was queued also when the code of the frame throws", () => {
		const { log, trace } = setup();
		expect(() =>
			log.run({ actor: A01 }, () => {
				log.emit(SRC, "placed", null);
				throw new TypeError("cell is taken");
			}),
		).toThrow("cell is taken");
		expect(trace).toEqual(["sink:placed"]);
		expect(log.frame()).toEqual({ actor: "kernel" });
	});

	it("gives the sinks an event whose listener threw, so the written log has no gap", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", () => {
			throw new TypeError("listener broke");
		});
		expect(() => log.emit(SRC, "placed", null)).toThrow("listener broke");
		expect(trace).toEqual(["sink:placed"]);
		expect(log.frame()).toEqual({ actor: "kernel" });
	});

	it("ends a sink that throws with SWT-R020; the other sinks still get every event", () => {
		const { log, trace } = setup();
		let calls = 0;
		log.addSink({
			write: () => {
				calls += 1;
				throw new TypeError("disk full");
			},
		});
		log.addSink({ write: (event) => trace.push(`late:${event.type}`) });
		expect(codeOf(() => log.emit(SRC, "placed", null))).toBe("SWT-R020");
		log.emit(SRC, "won", null);
		expect(calls).toBe(1);
		expect(trace).toEqual(["sink:placed", "late:placed", "sink:won", "late:won"]);
	});
});

describe("fail", () => {
	it("turns the listeners off, gives the queue to the sinks, writes the closing event, then takes nothing", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", () => trace.push("heard"));
		log.listen("kernel", "run_ended", () => trace.push("heard the end"));
		log.run({ actor: A01 }, () => {
			log.emit(SRC, "placed", null);
			log.fail(() => {
				trace.push("last");
				log.emit("kernel", "run_ended", { reason: "error" });
			});
			expect(trace).toEqual(["sink:placed", "last", "sink:run_ended"]);
		});
		expect(codeOf(() => log.emit(SRC, "placed", null))).toBe("SWT-R001");
		expect(log.all().map((event) => event.type)).toEqual(["placed", "run_ended"]);
		expect(trace).toEqual(["sink:placed", "last", "sink:run_ended"]);
	});

	it("acts only on its first call, and closes also when `last` throws", () => {
		const { log, trace } = setup();
		expect(() => {
			log.fail(() => {
				throw new TypeError("no end");
			});
		}).toThrow("no end");
		log.fail(() => trace.push("second call"));
		expect(trace).toEqual([]);
		expect(codeOf(() => log.emit("kernel", "run_ended", null))).toBe("SWT-R001");
	});

	it("writes the closing event also when a sink throws while the queue is flushed", () => {
		const { log } = setup();
		const kept: string[] = [];
		log.addSink({
			write: (event) => {
				if (event.type === "won") throw new TypeError("disk full");
			},
		});
		log.addSink({ write: (event) => void kept.push(event.type) });
		log.run({ actor: A01 }, () => {
			log.emit(SRC, "placed", null);
			log.emit(SRC, "won", null);
			expect(codeOf(() => {
				log.fail(() => log.emit("kernel", "run_ended", { reason: "error" }));
			})).toBe("SWT-R020");
		});
		expect(log.all().map((event) => event.type)).toEqual(["placed", "won", "run_ended"]);
		expect(kept).toEqual(["placed", "won", "run_ended"]);
		expect(codeOf(() => log.emit(SRC, "placed", null))).toBe("SWT-R001");
	});

	it("finishes inside a cascade: the events behind the failing one reach only the sinks", () => {
		const { log, trace } = setup();
		log.listen(SRC, "placed", () => {
			log.emit(SRC, "won", null);
			log.fail(() => log.emit("kernel", "run_ended", null));
		});
		log.listen(SRC, "won", () => trace.push("heard won"));
		log.emit(SRC, "placed", null);
		expect(trace).toEqual(["sink:won", "sink:run_ended", "sink:placed"]);
	});
});

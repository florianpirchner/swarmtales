// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import type { ActorSpec, Envelope } from "@swarmtales/contracts";
import { createActors } from "../src/actors.ts";
import type { Log } from "../src/parts.ts";

/** A log that keeps what is emitted and does nothing else. */
function fakeLog(): Log {
	const events: Envelope[] = [];
	return {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		emit: (source, type, payload) => {
			const event: Envelope = { seq: events.length + 1, tick: 0, source, type, actor: "kernel", payload };
			events.push(event);
			return event;
		},
		run: (_frame, code) => code(),
		frame: () => ({ actor: "kernel" }),
		listen: () => undefined,
		addSink: () => undefined,
		fail: () => undefined,
	};
}

const SPECS: readonly ActorSpec[] = [
	{ id: "worker:A01", kind: "worker", grant: "worker", shared: { side: "x", toString: 1 } },
	{ id: "worker:A02", kind: "worker", grant: "worker", shared: {} },
	{ id: "watcher:W1", kind: "watcher", grant: "watcher", shared: {} },
];

const written = (log: Log): readonly unknown[] => log.all().map((event) => [event.source, event.type, event.payload]);

describe("the actors (part 3)", () => {
	it("lists the actors in the definition's order, by kind, and reads the shared bag", () => {
		const actors = createActors(SPECS, fakeLog());
		expect(actors.ids).toEqual(["worker:A01", "worker:A02", "watcher:W1"]);
		expect(actors.ofKind("worker")).toEqual(["worker:A01", "worker:A02"]);
		expect(actors.ofKind("nobody")).toEqual([]);
		expect([actors.has("watcher:W1"), actors.has("script"), actors.has("worker:A09")]).toEqual([true, false, false]);
		expect(actors.spec("worker:A02")).toBe(SPECS[1]);
		expect(actors.spec("script")).toBeUndefined();
		expect([actors.shared("worker:A01", "side"), actors.shared("worker:A01", "toString"), actors.shared("worker:A02", "toString"), actors.shared("script", "side")]).toEqual(["x", 1, undefined, undefined]);
		expect(actors.portFor("a").ofKind("watcher")).toEqual(["watcher:W1"]);
	});

	it("refuses a definition that lists an actor twice (SWT-R002)", () => {
		expect(() => createActors([...SPECS, { id: "worker:A01", kind: "worker", grant: "worker", shared: {} }], fakeLog())).toThrowError(/SWT-R002.*"worker:A01" twice/s);
	});

	it("suspends per plugin: one event per change, none for a repeat, and the actor acts again when every plugin has lifted its own", () => {
		const log = fakeLog();
		const actors = createActors(SPECS, log);
		const [a, b] = [actors.portFor("a"), actors.portFor("b")];
		expect(actors.mayAct("worker:A01")).toBe(true);
		a.suspend("worker:A01", "sleeps");
		a.suspend("worker:A01", "sleeps again");
		b.suspend("worker:A01", "waits");
		expect(written(log)).toEqual([
			["kernel", "actor_suspended", { actor: "worker:A01", by: "a", reason: "sleeps" }],
			["kernel", "actor_suspended", { actor: "worker:A01", by: "b", reason: "waits" }],
		]);
		expect(actors.state()).toEqual({ "worker:A01": ["a", "b"] });
		a.resume("worker:A01");
		a.resume("worker:A01");
		a.resume("worker:A02");
		expect([actors.mayAct("worker:A01"), b.mayAct("worker:A01"), actors.mayAct("worker:A02")]).toEqual([false, false, true]);
		b.resume("worker:A01");
		expect(written(log).slice(2)).toEqual([
			["kernel", "actor_resumed", { actor: "worker:A01", by: "a" }],
			["kernel", "actor_resumed", { actor: "worker:A01", by: "b" }],
		]);
		expect(actors.mayAct("worker:A01")).toBe(true);
		expect(actors.state()).toEqual({});
	});

	it("says that an id outside the run may not act, and refuses to suspend it", () => {
		const log = fakeLog();
		const actors = createActors(SPECS, log);
		expect([actors.mayAct("script"), actors.mayAct("worker:A09")]).toEqual([false, false]);
		expect(() => {
			actors.portFor("a").suspend("worker:A09", "why");
		}).toThrowError(new RangeError('a: no actor "worker:A09" to suspend'));
		expect(log.length).toBe(0);
	});

	it("restores the suspensions of a snapshot without an event and replaces what was held", () => {
		const log = fakeLog();
		const actors = createActors(SPECS, log);
		actors.portFor("a").suspend("worker:A02", "before");
		actors.restore({ "worker:A01": ["a", "b"], "watcher:W1": [] });
		expect(log.length).toBe(1);
		expect(actors.state()).toEqual({ "worker:A01": ["a", "b"] });
		expect([actors.mayAct("worker:A01"), actors.mayAct("worker:A02")]).toEqual([false, true]);
		actors.portFor("b").resume("worker:A01");
		expect(actors.state()).toEqual({ "worker:A01": ["a"] });
		expect(() => {
			actors.restore({ "worker:A09": ["a"] });
		}).toThrowError(/SWT-R002.*"worker:A09"/s);
	});
});

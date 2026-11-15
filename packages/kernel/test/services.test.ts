// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type Envelope, type ProvidedService } from "@swarmtales/contracts";
import type { Frame, Log } from "../src/parts.ts";
import { createServices } from "../src/services.ts";

/** A log that keeps frames and events and delivers nothing. */
function fakeLog(): Log {
	const events: Envelope[] = [];
	const frames: Frame[] = [];
	const frame = (): Frame => frames.at(-1) ?? { actor: "kernel" };
	return {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		emit(source, type, payload) {
			const { actor, causedBy } = frame();
			const event = { seq: events.length + 1, tick: 0, source, type, actor, ...(causedBy === undefined ? {} : { causedBy }), payload };
			events.push(event);
			return event;
		},
		run(next, code) {
			frames.push(next);
			try {
				return code();
			} finally {
				frames.pop();
			}
		},
		frame,
		listen: () => undefined,
		addSink: () => undefined,
		fail: () => undefined,
	};
}

/** The code and the summary of what `run` throws: of an `SwtError` its first issue, else the error's name and message. */
function failure(run: () => unknown): { readonly code: string; readonly summary: string; readonly fix: string } {
	try {
		run();
	} catch (thrown) {
		if (thrown instanceof SwtError) return { code: thrown.code, summary: thrown.issues[0]?.summary ?? "", fix: thrown.issues[0]?.fix ?? "" };
		return { code: thrown instanceof Error ? thrown.name : "", summary: String(thrown), fix: "" };
	}
	return { code: "nothing thrown", summary: "", fix: "" };
}

const method = (kind: "command" | "query") => ({ kind, input: Type.Unknown(), output: Type.Unknown(), summary: kind });

/** A service `store` with a command `put`, a query `get` and a command `fail` that throws; `put` emits an event of its own. */
function store(log: Log): ProvidedService {
	return {
		service: { name: "store", summary: "a store", methods: { put: method("command"), get: method("query"), fail: method("command") } },
		call(name, input, caller) {
			if (name === "fail") throw new TypeError("no room");
			if (name === "put") log.emit("pkg/keeper", "stored", { input, caller });
			return `${name} for ${caller}`;
		},
	};
}

describe("createServices", () => {
	it("a command writes `service_called` in the caller's frame and runs the provider in a frame caused by it", () => {
		const log = fakeLog();
		const services = createServices(log);
		services.provide("keeper", store(log));
		const answer = log.run({ actor: "resident:A01", causedBy: 7 }, () => services.call("asker", "store", "put", { key: 1 }));
		expect(answer).toBe("put for asker");
		expect(log.all()).toEqual([
			{ seq: 1, tick: 0, source: "kernel", type: "service_called", actor: "resident:A01", causedBy: 7, payload: { service: "store", method: "put", caller: "asker", input: { key: 1 } } },
			{ seq: 2, tick: 0, source: "pkg/keeper", type: "stored", actor: "resident:A01", causedBy: 1, payload: { input: { key: 1 }, caller: "asker" } },
		]);
		expect(log.frame()).toEqual({ actor: "kernel" });
	});

	it("writes a missing input as null, and a query writes nothing", () => {
		const log = fakeLog();
		const services = createServices(log);
		services.provide("keeper", store(log));
		expect(services.call("asker", "store", "get", { key: 1 })).toBe("get for asker");
		expect(log.length).toBe(0);
		services.call("asker", "store", "put", undefined);
		expect(log.all()[0]?.payload).toEqual({ service: "store", method: "put", caller: "asker", input: null });
	});

	it("knows its providers and refuses a second one, an unknown service, an unknown method and a provider's throw", () => {
		const log = fakeLog();
		const services = createServices(log);
		expect(services.has("store")).toBe(false);
		services.provide("keeper", store(log));
		expect(services.has("store")).toBe(true);
		expect(failure(() => { services.provide("other", store(log)); })).toMatchObject({ code: "SWT-R002", summary: '"keeper" and "other" both provide the service "store"' });
		expect(failure(() => services.call("asker", "shop", "put", 1)).code).toBe("RangeError");
		expect(failure(() => services.call("asker", "store", "toString", 1)).code).toBe("RangeError");
		expect(log.length).toBe(0);
		expect(failure(() => services.call("asker", "store", "fail", 1))).toMatchObject({ code: "SWT-R003", summary: "keeper: no room" });
	});
});

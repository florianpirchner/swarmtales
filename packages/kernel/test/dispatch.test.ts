// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type ActorId, type Envelope, type KernelDefinition, type PreparedCall, type Refusal, type StageHandlers, type Submission, type ToolOutcome } from "@swarmtales/contracts";
import { createDispatch } from "../src/dispatch.ts";
import type { Dispatch, DispatchParts, Frame, LoadedTool, Log } from "../src/parts.ts";

const A: ActorId = "worker:A";
const PUT = "@x/grid/grid/put";
const PEEK = "@x/grid/grid/peek";
const STOP = "@x/grid/grid/stop";

function unused(): never {
	throw new TypeError("not used by dispatch");
}
function no(code: string, detail?: string): Refusal {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

/** A log as `parts.ts` says: frames, and delivery to the listeners when the outermost frame returns. */
function fakeLog(): Log {
	const events: Envelope[] = [];
	const stack: Frame[] = [];
	const queue: Envelope[] = [];
	const listeners: { readonly key: string; readonly run: (event: Envelope) => void }[] = [];
	const log: Log = {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.slice(seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		frame: () => stack.at(-1) ?? { actor: "kernel" },
		emit(source, type, payload, extra) {
			const event: Envelope = { seq: events.length + 1, tick: 0, source, type, ...log.frame(), ...extra, payload };
			events.push(event);
			queue.push(event);
			return event;
		},
		run(frame, code) {
			stack.push(frame);
			let result;
			try {
				result = code();
			} finally {
				stack.pop();
			}
			for (let event = stack.length === 0 ? queue.shift() : undefined; event !== undefined; event = queue.shift()) {
				const { source, type, actor, seq } = event;
				for (const listener of listeners.filter(({ key }) => key === `${source}/${type}`))
					log.run({ actor, causedBy: seq }, () => {
					listener.run(event);
				});
			}
			return result;
		},
		listen: (source, type, run) => void listeners.push({ key: `${source}/${type}`, run }),
		addSink: unused,
		fail: unused,
	};
	return log;
}

/** What a test scripts: the three tools' behaviour, the handlers, and the answers of the neighbours. */
interface World {
	readonly log: Log;
	readonly dispatch: Dispatch;
	readonly trace: string[];
	readonly failures: unknown[];
	readonly staged: { [K in "lock" | "rule" | "after"]: NonNullable<StageHandlers[K]>[] };
	readonly set: { stepsLeft: number; mayAct: boolean; locked: boolean; rule: Refusal | undefined; execute: () => ToolOutcome; first?: unknown };
	probe(actor: ActorId, tool: string): boolean;
	call(as: string, params?: unknown, more?: Partial<Submission>): Promise<ToolOutcome>;
	/** The events from `from` on as `type[:stage:code]`. */
	types(from?: number): string[];
}

function world(): World {
	const log = fakeLog();
	const trace: string[] = [];
	const failures: unknown[] = [];
	const staged: World["staged"] = { lock: [], rule: [], after: [] };
	const set: World["set"] = { stepsLeft: 99, mayAct: true, locked: false, rule: undefined, execute: () => ({ ok: true, reply: "done" }) };
	const prepare = (raw: unknown): PreparedCall | undefined => (typeof raw === "number" ? { params: { cell: raw }, rule: () => set.rule, execute: () => set.execute() } : undefined);
	const tool = (name: string, free: boolean): LoadedTool => ({ canonical: `@x/grid/grid/${name}`, owner: "grid", tool: { name, description: name, parameters: Type.Number(), free, prepare } });
	const tools = [tool("put", false), tool("peek", true), tool("stop", false)];
	const grants: Readonly<Record<string, readonly string[]>> = { worker: [PUT, PEEK], boss: [STOP] };
	const definition: KernelDefinition = {
		game: { id: "g", hash: "0".repeat(64) },
		seed: 1,
		actors: [{ id: A, kind: "worker", grant: "worker", shared: {} }],
		plugins: [],
		scheduler: { definition: { id: "s", revision: 1, determinism: "seeded", options: Type.Object({}), events: {}, create: unused }, options: {} },
		grants,
		names: { [PUT]: "place", [PEEK]: "peek", [STOP]: "stop" },
		startLocks: {},
		replies: { TOOL_UNKNOWN: "no such tool", STEP_LIMIT: "used up" },
		limits: { maxTicks: 1 },
	};
	let probe: World["probe"] = unused;
	const parts: DispatchParts = {
		definition,
		log,
		actors: { ids: [A], ofKind: unused, has: unused, shared: unused, portFor: unused, state: unused, restore: unused, mayAct: () => set.mayAct, spec: (id) => definition.actors.find((actor) => actor.id === id) },
		access: { grantsOf: unused, portFor: unused, state: unused, restore: unused, granted: (grant, name) => grants[grant]?.includes(name) === true, isLocked: () => set.locked, setProbe: (given) => void (probe = given) },
		steps: { tickStarted: unused, step: (actor) => (trace.push(`step ${actor}`), (set.stepsLeft -= 1) >= 0) },
		loaded: { order: ["grid"], instances: new Map(), limits: [], hooks: () => [], tools: new Map(tools.map((entry) => [entry.canonical, entry])), byShownName: new Map(tools.map((entry) => [definition.names[entry.canonical] ?? "", [entry]])), stages: (stage) => staged[stage] },
		fail: (error) => (failures.push(error), set.first),
		staged: [],
	};
	const dispatch = createDispatch(parts);
	return {
		log, dispatch, trace, failures, staged, set,
		probe: (actor, name) => probe(actor, name),
		call: (as, params, more) => dispatch.submit({ actor: A, as, params, ...more }),
		types: (from = 0) => log.all().slice(from).map(({ type, payload }) => [type, ...(typeof payload === "object" && payload !== null && "stage" in payload && "code" in payload ? [payload.stage, payload.code] : [])].join(":")),
	};
}

describe("the dispatch pipeline (3.3), row by row", () => {
	it("row 0: writes `tool_called` with basis, cause and tool; every later event is caused by it", async () => {
		const w = world();
		w.log.emit("kernel", "tick_started", {});
		await w.call("place", 4);
		await w.call("place", 5, { basis: 1, causedBy: 1 });
		const [, called, result, second] = w.log.all();
		expect(called).toEqual({ seq: 2, tick: 0, source: "kernel", type: "tool_called", actor: A, tool: PUT, basis: 1, payload: { as: "place", params: 4 } });
		expect(result).toMatchObject({ type: "tool_result", actor: A, causedBy: 2, tool: PUT });
		expect(second).toMatchObject({ seq: 4, basis: 1, causedBy: 1 });
		await w.call("peek");
		expect(w.log.all()[5]?.payload).toEqual({ as: "peek", params: null });
		// The default basis is the log when the call was submitted, not when the calls before it have run.
		const before = w.log.length;
		await Promise.all([w.call("place", 1), w.call("place", 2)]);
		expect(w.log.all().slice(before).flatMap((event) => (event.type === "tool_called" ? [event.basis] : []))).toEqual([before, before]);
	});

	it("row 1: the step is counted before the lock, with the detail of the definition; a free tool is not counted", async () => {
		const w = world();
		w.set.stepsLeft = 0;
		expect(await w.call("nothing")).toEqual(no("STEP_LIMIT", "used up"));
		expect(await w.call("place", 1)).toEqual(no("STEP_LIMIT", "used up"));
		expect(w.types()).toEqual(["tool_called", "tool_refused:limit:STEP_LIMIT", "tool_called", "tool_refused:limit:STEP_LIMIT"]);
		expect(await w.call("peek", 1)).toMatchObject({ ok: true });
		expect(w.trace).toEqual([`step ${A}`, `step ${A}`]);
	});

	it("row 2: unknown, not granted, locked, then the lock handlers with the raw arguments", async () => {
		const w = world();
		expect(await w.call("nothing")).toEqual(no("TOOL_UNKNOWN", "no such tool"));
		expect(await w.call("stop", 1)).toEqual(no("TOOL_NOT_GRANTED"));
		expect(await w.dispatch.submit({ actor: "script", as: "place", params: 1 })).toEqual(no("TOOL_NOT_GRANTED"));
		expect(w.log.all().every((event) => event.tool === undefined)).toBe(true);
		w.set.locked = true;
		expect(await w.call("place", 1)).toEqual(no("TOOL_LOCKED"));
		w.set.locked = false;
		w.set.mayAct = false;
		expect(await w.call("place", 1)).toEqual(no("TOOL_LOCKED"));
		w.set.mayAct = true;
		w.staged.lock.push((call) => (w.trace.push(JSON.stringify(call)), undefined), () => no("CLOSED", "later"), unused);
		const from = w.log.length;
		expect(await w.call("place", "raw")).toEqual(no("CLOSED", "later"));
		expect(w.trace.at(-1)).toBe(JSON.stringify({ tool: PUT, name: "put", as: "place", owner: "grid", actor: A, params: "raw", seq: from + 1 }));
		expect(w.log.all().at(-1)).toMatchObject({ tool: PUT, causedBy: from + 1, payload: { as: "place", stage: "lock", code: "CLOSED", detail: "later" } });
		expect(w.types().filter((type) => type.startsWith("tool_refused")).map((type) => type.split(":")[1])).toEqual(Array.from({ length: 6 }, () => "lock"));
	});

	it("row 3: arguments the tool does not take are refused with the bare code", async () => {
		const w = world();
		w.staged.rule.push(unused);
		expect(await w.call("place", "x")).toEqual(no("INVALID_ARGUMENTS"));
		expect(w.log.all()[1]?.payload).toEqual({ as: "place", stage: "parse", code: "INVALID_ARGUMENTS" });
	});

	it("row 4: the tool's own rule, then the rule handlers with the checked arguments", async () => {
		const w = world();
		w.set.execute = unused;
		w.staged.rule.push((call) => (w.trace.push(JSON.stringify(call.params)), no("HANDLER")));
		expect(await w.call("place", 3)).toEqual(no("HANDLER"));
		w.set.rule = no("OWN");
		expect(await w.call("place", 3)).toEqual(no("OWN"));
		expect(w.trace.filter((line) => !line.startsWith("step"))).toEqual(['{"cell":3}']);
		expect(w.types()).toEqual(["tool_called", "tool_refused:rule:HANDLER", "tool_called", "tool_refused:rule:OWN"]);
	});

	it("rows 5 and 6: a refused execute is reported at `execute` and still reaches the after handlers; an earlier refusal does not", async () => {
		const w = world();
		w.staged.after.push((call, outcome) => void w.trace.push(`after ${JSON.stringify(call.params)} ${String(outcome.ok)}`));
		w.set.execute = () => no("TAKEN", "choose another");
		expect(await w.call("place", 3)).toEqual(no("TAKEN", "choose another"));
		await w.call("place", "x");
		expect(w.types()).toEqual(["tool_called", "tool_refused:execute:TAKEN", "tool_called", "tool_refused:parse:INVALID_ARGUMENTS"]);
		expect(w.trace.filter((line) => line.startsWith("after"))).toEqual(['after {"cell":3} false']);
	});

	it("row 6: the listeners of what `execute` emitted run before the after handlers, and each handler is its own frame", async () => {
		const w = world();
		w.log.listen("grid", "placed", () => void w.trace.push("listener"));
		w.set.execute = () => (w.log.emit("grid", "placed", {}), w.trace.push("execute"), { ok: true, reply: "done" });
		w.staged.after.push(() => void w.trace.push(`after 1 ${JSON.stringify(w.log.frame())}`), () => void w.trace.push("after 2"));
		await w.call("place", 3);
		expect(w.trace.slice(1)).toEqual(["execute", "listener", `after 1 ${JSON.stringify({ actor: A, causedBy: 1, tool: PUT })}`, "after 2"]);
		expect(w.log.all()[1]).toMatchObject({ source: "grid", type: "placed", actor: A, causedBy: 1, tool: PUT });
	});

	it("row 7: `tool_result` after the after handlers, `endsTurn` only when true, and the seq of the answer", async () => {
		const w = world();
		w.staged.after.push(() => void w.log.emit("grid", "seen", {}));
		expect(w.dispatch.answerSeq(A)).toBeUndefined();
		expect(await w.call("place", 3)).toEqual({ ok: true, reply: "done" });
		expect(w.log.all()[2]).toMatchObject({ seq: 3, type: "tool_result" });
		expect(w.log.all()[2]?.payload).toEqual({ as: "place", reply: "done" });
		expect(w.dispatch.answerSeq(A)).toBe(3);
		w.set.execute = () => ({ ok: true, reply: "over", endsTurn: true });
		await w.call("place", 3);
		expect(w.log.all()[5]?.payload).toEqual({ as: "place", reply: "over", endsTurn: true });
		await w.call("nothing");
		expect(w.dispatch.answerSeq(A)).toBe(8);
	});
});

describe("quiet end, lane, failure, probe", () => {
	it("a refused free look is a quiet end; a success that ends the activation is one until the next call", async () => {
		const w = world();
		await w.call("place", 3);
		expect(w.dispatch.quietEnd(A)).toBe(false);
		w.set.locked = true;
		expect(await w.call("peek", 1)).toMatchObject({ ok: false });
		expect(w.dispatch.quietEnd(A)).toBe(true);
		w.set.locked = false;
		w.set.execute = () => ({ ok: true, reply: "over", endsTurn: true });
		await w.call("place", 3);
		expect(w.dispatch.quietEnd(A)).toBe(true);
		await w.call("place", "x");
		expect(w.dispatch.quietEnd(A)).toBe(false);
	});

	it("a throw breaks the lane: told once, `SWT-R003` with the cause, then `SWT-R001` with the first failure", async () => {
		const w = world();
		const boom = new RangeError("boom");
		w.set.execute = () => {
			throw boom;
		};
		const [first, second] = await Promise.allSettled([w.call("place", 1), w.call("place", 2)]);
		expect(first).toMatchObject({ status: "rejected", reason: { code: "SWT-R003", cause: boom } });
		expect(second).toMatchObject({ status: "rejected", reason: { code: "SWT-R001", cause: { cause: boom } } });
		expect(second.status === "rejected" && second.reason instanceof SwtError).toBe(true);
		expect(w.failures).toHaveLength(1);
		expect(w.types()).toEqual(["tool_called"]);
	});

	it("a call that throws after another part failed is `SWT-R001` with the first failure of the run (O12)", async () => {
		const w = world();
		const first = new TypeError("a hook broke");
		w.set.first = first;
		w.set.execute = () => {
			throw new RangeError("the log is closed");
		};
		const [waiting, later] = await Promise.allSettled([w.call("place", 1), w.call("place", 2)]);
		expect(waiting).toMatchObject({ status: "rejected", reason: { code: "SWT-R001", cause: first } });
		expect(later).toMatchObject({ status: "rejected", reason: { code: "SWT-R001", cause: first } });
	});

	it("runs the calls one after the other, in the order they were submitted", async () => {
		const w = world();
		await Promise.all([w.call("place", 1), w.call("peek", 2), w.call("place", "x")]);
		expect(w.log.all().map((event) => event.payload).map((payload) => (typeof payload === "object" && payload !== null && "as" in payload ? payload.as : ""))).toEqual(["place", "place", "peek", "peek", "place", "place"]);
	});

	it("the probe asks every lock handler with a call without arguments, and refuses a handler that emits", () => {
		const w = world();
		expect(w.probe(A, PUT)).toBe(true);
		expect(w.probe(A, "@x/none")).toBe(false);
		w.staged.lock.push((call) => (call.tool === PUT && call.as === "place" && call.params === undefined ? no("CLOSED") : undefined));
		expect([w.probe(A, PUT), w.probe(A, PEEK)]).toEqual([false, true]);
		w.staged.lock.push(() => void w.log.emit("grid", "seen", {}));
		expect(() => w.probe(A, PEEK)).toThrow(/must not emit/);
	});
});

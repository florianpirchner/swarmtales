// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `turns` against a stub `SchedulerPort`: the order vectors of section 3.6, the gate of a block, each wake rule,
 * pending, the errors, and a differential test against activations that the old turn loop recorded.
 */
import { actorId, nameOf, SwtError } from "@swarmtales/contracts";
import type { ActorDriver, ActorId, DriverTable, OpenActivation, RunEnd, SchedulerPort } from "@swarmtales/contracts";
import { rngFor } from "@swarmtales/kernel";
import { Type } from "typebox";
import { Check, Default } from "typebox/value";
import { describe, expect, it } from "vitest";
import { TurnsOptions } from "../src/turns/options.ts";
import { turns } from "../src/turns/turns.ts";

const text = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));

interface Stub {
	readonly port: SchedulerPort;
	/** `open`, `skip` and `said` lines in the form of the old recording, plus `close` lines. */
	readonly log: string[];
	readonly reasons: string[];
	/** The names with news: a `say` call adds its target, building the inputs clears it. */
	readonly heard: string[];
	readonly asleep: Set<string>;
	/** The names whose calls end quietly: `quietEnd` turns true with their first call. */
	readonly quiet: Set<string>;
	toAct: readonly ActorId[] | undefined;
	haltAt: number | undefined;
}

// A port over `count` residents A01.. that ends the run after `maxTicks` ticks. The one tool says something to a name.
function stub(seed: number, count: number, maxTicks: number): Stub {
	const ids = Array.from({ length: count }, (_, index) => actorId("resident", `A0${String(index + 1)}`));
	let tick = 0;
	const self: Omit<Stub, "port"> = { log: [], reasons: [], heard: [], asleep: new Set(), quiet: new Set(), toAct: undefined, haltAt: undefined };
	const open: SchedulerPort["open"] = (actor, inputs, detail): OpenActivation => {
		const name = nameOf(actor);
		let calls = 0;
		self.log.push(`open ${String(tick)}/${text(detail.pass)}/${text(detail.block)} ${name}`);
		self.reasons.push(`${name} ${text(detail.reason)}`);
		return {
			actor, tick, basis: self.log.length, detail, inputs, tools: [],
			call: (as, params) => {
				calls += 1;
				self.log.push(`said ${name}>${String(params)}`);
				self.heard.push(String(params));
				return Promise.resolve({ ok: true, reply: as });
			},
			record: (source, type, payload) => ({ seq: self.log.push(`record ${name}`), tick, source, type, actor, payload }),
			close: (failed) => self.log.push(`close ${name} ${failed ? "error" : calls > 0 ? "acted" : "no-call"}`),
			// Live, as the kernel's (erratum E7): true only once a call of a quiet name has landed.
			get quietEnd() { return self.quiet.has(name) && calls > 0; },
		};
	};
	const port: SchedulerPort = {
		seed,
		get tick() { return tick; },
		actors: { ids, ofKind: (kind) => (kind === "resident" ? ids : []), has: (id) => ids.some((known) => known === id), mayAct: (id) => !self.asleep.has(nameOf(id)), shared: () => undefined },
		get halted() { return self.haltAt !== undefined && self.log.length >= self.haltAt; },
		rng: (...labels) => rngFor(seed, ...labels),
		emit: (type, payload) => {
			const data: Record<string, unknown> = typeof payload === "object" && payload !== null ? Object.fromEntries(Object.entries(payload)) : {};
			self.log.push(type === "pass_started" ? `pass ${text(data.pass)}: ${text(data.blocks)}` : `skip ${String(tick)}/${text(data.pass)}/${text(data.block)} ${text(data.actor).slice(-3)}`);
			return { seq: self.log.length, tick, source: turns.id, type, actor: "kernel", payload };
		},
		beginTick: () => Promise.resolve(),
		endTick: (idle): Promise<RunEnd | undefined> => {
			self.log.push(`end ${String(tick)}${idle ? " idle" : ""}`);
			tick += 1;
			return Promise.resolve(tick >= maxTicks ? { reason: "ticks", tick } : undefined);
		},
		hasNews: (actor) => self.heard.includes(nameOf(actor)),
		toAct: () => self.toAct,
		inputsFor: (actor) => {
			self.heard.splice(0, self.heard.length, ...self.heard.filter((name) => name !== nameOf(actor)));
			return [{ source: "talk", text: `tick ${String(tick)}` }];
		},
		open,
	};
	return { ...self, port, get toAct() { return self.toAct; }, set toAct(value) { self.toAct = value; }, get haltAt() { return self.haltAt; }, set haltAt(value) { self.haltAt = value; } };
}

const options = (given: Partial<TurnsOptions>): TurnsOptions => ({ passes: 1, blockSize: 1, activation: "always", order: "seeded", kinds: ["resident"], inputs: [], ...given });
const idle: ActorDriver = () => Promise.resolve(undefined);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });
const play = (s: Stub, given: Partial<TurnsOptions>, drivers: DriverTable, until?: { ticks: number }): Promise<RunEnd | undefined> => turns.create(options(given)).run(s.port, drivers, until);
const lines = (s: Stub, prefix: string): readonly string[] => s.log.filter((line) => line.startsWith(prefix));

describe("turns: order, blocks and ticks", () => {
	it("shuffles with the streams (turns, tick) and (turns, tick, pass): the vectors of 3.6", async () => {
		const s = stub(11, 6, 1);
		expect(await play(s, { passes: 2, blockSize: 4 }, { resident: idle })).toEqual({ reason: "ticks", tick: 1 });
		expect(lines(s, "pass")).toEqual(['pass 1: [["resident:A06","resident:A01","resident:A03","resident:A04"],["resident:A05","resident:A02"]]', 'pass 2: [["resident:A06","resident:A04","resident:A05","resident:A02"],["resident:A01","resident:A03"]]']);
		const roster = stub(11, 3, 1);
		await play(roster, { order: "roster" }, { resident: idle });
		expect(lines(roster, "open").map((line) => line.slice(-3))).toEqual(["A01", "A02", "A03"]);
		expect(Default(TurnsOptions, {})).toEqual(options({}));
		expect([turns.id, turns.revision, turns.determinism, Object.keys(turns.events)]).toEqual(["@swarmtales/engine/turns", 1, "seeded", ["pass_started", "activation_skipped"]]);
		// Closed payloads, as the kernel's events.
		expect(Check(turns.events.pass_started ?? Type.Never(), { pass: 1, order: [], blocks: [] })).toBe(true);
		expect(Check(turns.events.pass_started ?? Type.Never(), { pass: 1, order: [], blocks: [], tick: 0 })).toBe(false);
		expect(Check(turns.events.activation_skipped ?? Type.Never(), { actor: "resident:A01", pass: 1, block: 1, reason: "news" })).toBe(false);
	});

	it("lands the calls of a block in order, whatever the drivers' timing, and builds all inputs first", async () => {
		const s = stub(7, 4, 1);
		const started: string[] = [];
		const slowFirst: ActorDriver = async (activation) => {
			started.push(`${nameOf(activation.actor)} ${String(activation.basis)} ${JSON.stringify(activation.detail)} ${activation.inputs.map((note) => note.text).join()}`);
			await sleep(40 - 10 * Number(activation.actor.slice(-1)));
			await activation.call("say", "A01");
		};
		await play(s, { blockSize: 4, order: "roster" }, { resident: slowFirst });
		expect(s.log.slice(1)).toEqual(["open 0/1/1 A01", "open 0/1/1 A02", "open 0/1/1 A03", "open 0/1/1 A04", ...["A01", "A02", "A03", "A04"].flatMap((name) => [`said ${name}>A01`, `close ${name} acted`]), "end 0"]);
		expect(started[1]).toBe('A02 3 {"pass":1,"block":1,"reason":"always"} tick 0');
	});

	it("stops at until, stops a pass when halted, and reports an idle tick", async () => {
		const s = stub(7, 2, 5);
		const scheduler = turns.create(options({ passes: 2 }));
		expect(await scheduler.run(s.port, { resident: idle }, { ticks: 2 })).toBeUndefined();
		expect(lines(s, "end")).toEqual(["end 0", "end 1"]);
		s.haltAt = s.log.length + 3;
		await scheduler.run(s.port, { resident: idle }, { ticks: 2 });
		expect(s.log.slice(-5).map((line) => line.slice(0, 4))).toEqual(["pass", "open", "clos", "end ", "end "]);
		expect(s.log.at(-1)).toBe("end 3 idle");
	});

	it("plays nothing with until.ticks 0 and leaves the run open", async () => {
		const s = stub(7, 2, 5);
		expect(await play(s, {}, { resident: idle }, { ticks: 0 })).toBeUndefined();
		expect(s.log).toEqual([]);
	});
});

describe("turns: the wake rule", () => {
	it("always wakes everyone who may act; an actor who may not act gets nothing", async () => {
		const s = stub(7, 4, 1);
		s.asleep.add("A02");
		// A03 is suspended in the pass, after its order was drawn.
		const suspends: ActorDriver = () => Promise.resolve(void s.asleep.add("A03"));
		await play(s, { order: "roster" }, { "resident:A01": suspends, resident: idle });
		expect(s.reasons).toEqual(["A01 always", "A04 always"]);
		expect(lines(s, "skip")).toEqual([]);
	});

	it("onNews wakes on news or a pending answer, and a quiet end clears pending", async () => {
		const s = stub(7, 3, 3);
		s.heard.push("A02");
		s.quiet.add("A03");
		const scheduler = turns.create(options({ activation: "onNews", order: "roster" }));
		const pendingAfterNews: ActorDriver = async (activation) => {
			if (activation.detail.reason === "news") await activation.call("say", activation.actor === "resident:A02" ? "A03" : "A09");
			return { pending: activation.detail.reason === "news" };
		};
		await scheduler.run(s.port, { resident: pendingAfterNews }, { ticks: 1 });
		expect(scheduler.slice?.save()).toEqual({ pending: ["resident:A02"] });
		const restored = turns.create(options({ activation: "onNews", order: "roster" }));
		restored.slice?.load(JSON.parse(JSON.stringify(scheduler.slice?.save())), 1);
		expect(() => restored.slice?.load({ pending: [1] }, 1)).toThrow();
		expect(() => restored.slice?.load({ pending: [], woken: [] }, 1)).toThrow();
		restored.slice?.load({ pending: ["resident:A02"] }, 1);
		await restored.run(s.port, { resident: pendingAfterNews });
		// A02 had news, then an answer pending once; A03 had news, but its activation ended quietly.
		expect(s.reasons).toEqual(["A02 news", "A03 news", "A02 answer"]);
		expect(lines(s, "skip")).toHaveLength(9 - 3);
		expect(restored.slice?.save()).toEqual({ pending: [] });
	});

	it("toAct wakes whom the plugin names; news and pending do not count; without a hook it is SWT-R014", async () => {
		const s = stub(7, 3, 2);
		s.heard.push("A01");
		s.toAct = ["resident:A03"];
		await play(s, { activation: "toAct", order: "roster" }, { resident: () => Promise.resolve({ pending: true }) });
		expect(s.reasons).toEqual(["A03 toAct", "A03 toAct"]);
		expect(lines(s, "skip")).toHaveLength(4);
		const none = stub(7, 3, 1);
		await expect(play(none, { activation: "toAct" }, { resident: idle })).rejects.toMatchObject({ code: "SWT-R014" });
		expect(none.log).toEqual([]);
	});
});

describe("turns: failures", () => {
	it("ends the run with SWT-R011 when an activated actor has no driver, after the block", async () => {
		const s = stub(7, 2, 1);
		const failure = play(s, { blockSize: 2, order: "roster" }, { "resident:A02": idle });
		await expect(failure).rejects.toBeInstanceOf(SwtError);
		await expect(failure).rejects.toMatchObject({ code: "SWT-R011" });
		expect(s.log.slice(1)).toEqual(["open 0/1/1 A02", "close A02 no-call"]);
	});

	it("does not stop the next member when one fails, and throws the first failure after the block", async () => {
		const s = stub(7, 3, 1);
		const failing: ActorDriver = async (activation) => {
			if (activation.actor !== "resident:A03") throw new RangeError(`broken ${activation.actor}`);
			await activation.call("say", "A01");
		};
		const thrower: ActorDriver = () => { throw new RangeError("not even a promise"); };
		await expect(play(s, { blockSize: 3, order: "roster" }, { resident: failing, "resident:A02": thrower })).rejects.toThrow("broken resident:A01");
		expect(s.log.slice(4)).toEqual(["close A01 error", "close A02 error", "said A03>A01", "close A03 acted"]);
	});
});

/**
 * The old turn loop (`TurnLoop` of the old kernel, run through `createHost` in the old checkout) on this setup: 4
 * residents, 3 minutes, 2 passes, block size 2, A01 with news at the start. The agent of resident n waits 8 - 2n
 * ms, makes no call when (minute + n) is a multiple of 3, else says something to the next resident; the agent of
 * A03 awaits an answer after a turn with a call. Recorded: `turn_started`, `turn_skipped` and `said`, in log order.
 */
const OLD: Readonly<Record<string, string>> = {
	"7 always": "open 0/1/1 A04, open 0/1/1 A03, said A04>A01, open 0/1/2 A02, open 0/1/2 A01, said A02>A03, said A01>A02, open 0/2/1 A02, open 0/2/1 A04, said A02>A03, said A04>A01, open 0/2/2 A03, open 0/2/2 A01, said A01>A02, open 1/1/1 A01, open 1/1/1 A03, said A01>A02, said A03>A04, open 1/1/2 A02, open 1/1/2 A04, said A04>A01, open 1/2/1 A02, open 1/2/1 A01, said A01>A02, open 1/2/2 A03, open 1/2/2 A04, said A03>A04, said A04>A01, open 2/1/1 A04, open 2/1/1 A02, said A02>A03, open 2/1/2 A03, open 2/1/2 A01, said A03>A04, open 2/2/1 A01, open 2/2/1 A02, said A02>A03, open 2/2/2 A04, open 2/2/2 A03, said A03>A04",
	"7 onNews": "skip 0/1/1 A04, skip 0/1/1 A03, skip 0/1/2 A02, open 0/1/2 A01, said A01>A02, open 0/2/1 A02, skip 0/2/1 A04, said A02>A03, open 0/2/2 A03, skip 0/2/2 A01, skip 1/1/1 A01, skip 1/1/1 A03, skip 1/1/2 A02, skip 1/1/2 A04, skip 1/2/1 A02, skip 1/2/1 A01, skip 1/2/2 A03, skip 1/2/2 A04, skip 2/1/1 A04, skip 2/1/1 A02, skip 2/1/2 A03, skip 2/1/2 A01, skip 2/2/1 A01, skip 2/2/1 A02, skip 2/2/2 A04, skip 2/2/2 A03",
	"11 always": "open 0/1/1 A01, open 0/1/1 A04, said A01>A02, said A04>A01, open 0/1/2 A03, open 0/1/2 A02, said A02>A03, open 0/2/1 A04, open 0/2/1 A03, said A04>A01, open 0/2/2 A01, open 0/2/2 A02, said A01>A02, said A02>A03, open 1/1/1 A03, open 1/1/1 A02, said A03>A04, open 1/1/2 A01, open 1/1/2 A04, said A01>A02, said A04>A01, open 1/2/1 A02, open 1/2/1 A04, said A04>A01, open 1/2/2 A01, open 1/2/2 A03, said A01>A02, said A03>A04, open 2/1/1 A03, open 2/1/1 A04, said A03>A04, open 2/1/2 A02, open 2/1/2 A01, said A02>A03, open 2/2/1 A01, open 2/2/1 A03, said A03>A04, open 2/2/2 A04, open 2/2/2 A02, said A02>A03",
	"11 onNews": "open 0/1/1 A01, skip 0/1/1 A04, said A01>A02, skip 0/1/2 A03, open 0/1/2 A02, said A02>A03, skip 0/2/1 A04, open 0/2/1 A03, skip 0/2/2 A01, skip 0/2/2 A02, skip 1/1/1 A03, skip 1/1/1 A02, skip 1/1/2 A01, skip 1/1/2 A04, skip 1/2/1 A02, skip 1/2/1 A04, skip 1/2/2 A01, skip 1/2/2 A03, skip 2/1/1 A03, skip 2/1/1 A04, skip 2/1/2 A02, skip 2/1/2 A01, skip 2/2/1 A01, skip 2/2/1 A03, skip 2/2/2 A04, skip 2/2/2 A02",
	"41 always": "open 0/1/1 A04, open 0/1/1 A02, said A04>A01, said A02>A03, open 0/1/2 A03, open 0/1/2 A01, said A01>A02, open 0/2/1 A02, open 0/2/1 A03, said A02>A03, open 0/2/2 A04, open 0/2/2 A01, said A04>A01, said A01>A02, open 1/1/1 A02, open 1/1/1 A01, said A01>A02, open 1/1/2 A03, open 1/1/2 A04, said A03>A04, said A04>A01, open 1/2/1 A02, open 1/2/1 A01, said A01>A02, open 1/2/2 A03, open 1/2/2 A04, said A03>A04, said A04>A01, open 2/1/1 A02, open 2/1/1 A04, said A02>A03, open 2/1/2 A03, open 2/1/2 A01, said A03>A04, open 2/2/1 A03, open 2/2/1 A01, said A03>A04, open 2/2/2 A02, open 2/2/2 A04, said A02>A03",
	"41 onNews": "skip 0/1/1 A04, skip 0/1/1 A02, skip 0/1/2 A03, open 0/1/2 A01, said A01>A02, open 0/2/1 A02, skip 0/2/1 A03, said A02>A03, skip 0/2/2 A04, skip 0/2/2 A01, skip 1/1/1 A02, skip 1/1/1 A01, open 1/1/2 A03, skip 1/1/2 A04, said A03>A04, skip 1/2/1 A02, skip 1/2/1 A01, open 1/2/2 A03, open 1/2/2 A04, said A03>A04, said A04>A01, skip 2/1/1 A02, open 2/1/1 A04, open 2/1/2 A03, open 2/1/2 A01, said A03>A04, open 2/2/1 A03, skip 2/2/1 A01, said A03>A04, skip 2/2/2 A02, open 2/2/2 A04",
};

describe("turns: the activations of the old turn loop", () => {
	const scripted: ActorDriver = async (activation) => {
		const n = Number(activation.actor.slice(-1));
		await sleep(8 - 2 * n);
		if ((activation.tick + n) % 3 === 0) return { pending: false };
		await activation.call("say", `A0${String((n % 4) + 1)}`);
		return { pending: n === 3 };
	};

	it.each(Object.keys(OLD))("opens the same activations in the same order: seed and activation %s", async (key) => {
		const [seed, activation] = key.split(" ");
		const s = stub(Number(seed), 4, 3);
		s.heard.push("A01");
		expect(await play(s, { passes: 2, blockSize: 2, activation: activation === "onNews" ? "onNews" : "always" }, { resident: scripted })).toEqual({ reason: "ticks", tick: 3 });
		expect(s.log.filter((line) => /^(open|skip|said)/.test(line)).join(", ")).toBe(OLD[key]);
	});
});

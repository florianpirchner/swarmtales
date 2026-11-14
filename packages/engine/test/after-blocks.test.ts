// SPDX-License-Identifier: Apache-2.0
/**
 * The option `afterBlocks` of `turns` (specification of M3, section 8) against a stub `SchedulerPort` with
 * residents and actors of the kind `director`: the slots, the news rule, the round per slot, and that a game
 * without the option is untouched.
 */
import { actorId, kindOf, nameOf, SwtError } from "@swarmtales/contracts";
import type { ActorDriver, ActorId, DriverTable, OpenActivation, RunEnd, SchedulerPort } from "@swarmtales/contracts";
import { rngFor } from "@swarmtales/kernel";
import { Default } from "typebox/value";
import { describe, expect, it } from "vitest";
import { TurnsOptions } from "../src/turns/options.ts";
import { turns } from "../src/turns/turns.ts";

interface Stub {
	readonly port: SchedulerPort;
	/** `pass`, `open`, `said`, `close` and `end` lines. */
	readonly log: string[];
	/** The names with news: a call adds the name it is given, building the inputs clears it. */
	readonly heard: string[];
	readonly asleep: Set<string>;
	halted: boolean;
}

// A port over the residents A1.. and the directors D1.. that ends the run after one tick. The one tool gives news to a name.
function stub(residents: number, directors: number): Stub {
	const named = (kind: string, letter: string, count: number): ActorId[] => Array.from({ length: count }, (_, index) => actorId(kind, `${letter}${String(index + 1)}`));
	const ids = [...named("resident", "A", residents), ...named("director", "D", directors)];
	const self: Omit<Stub, "port"> = { log: [], heard: [], asleep: new Set(), halted: false };
	const open: SchedulerPort["open"] = (actor, inputs, detail): OpenActivation => {
		const name = nameOf(actor);
		self.log.push(`open ${name} ${JSON.stringify(detail)}`);
		return {
			actor, tick: 0, basis: self.log.length, detail, inputs, tools: [], quietEnd: false,
			call: (as, params) => {
				self.log.push(`said ${name}>${String(params)}`);
				self.heard.push(String(params));
				return Promise.resolve({ ok: true, reply: as });
			},
			record: (source, type, payload) => ({ seq: 0, tick: 0, source, type, actor, payload }),
			close: () => self.log.push(`close ${name}`),
		};
	};
	const port: SchedulerPort = {
		seed: 7,
		tick: 0,
		actors: { ids, ofKind: (kind) => ids.filter((id) => kindOf(id) === kind), has: (id) => ids.some((known) => known === id), mayAct: (id) => !self.asleep.has(nameOf(id)), shared: () => undefined },
		get halted() { return self.halted; },
		rng: (...labels) => rngFor(7, ...labels),
		emit: (type, payload) => {
			self.log.push(`${type} ${JSON.stringify(payload)}`);
			return { seq: self.log.length, tick: 0, source: turns.id, type, actor: "kernel", payload };
		},
		beginTick: () => Promise.resolve(),
		endTick: (): Promise<RunEnd | undefined> => Promise.resolve({ reason: "ticks", tick: 1 }),
		hasNews: (actor) => self.heard.includes(nameOf(actor)),
		toAct: () => undefined,
		inputsFor: (actor) => {
			self.heard.splice(0, self.heard.length, ...self.heard.filter((name) => name !== nameOf(actor)));
			return [];
		},
		open,
	};
	return Object.assign(self, { port });
}

const options = (given: Partial<TurnsOptions>): TurnsOptions => ({ passes: 1, blockSize: 1, activation: "always", order: "roster", kinds: ["resident"], inputs: [], ...given });
const idle: ActorDriver = () => Promise.resolve(undefined);
// A driver that gives news to the name the table holds for the actor, once.
const tells = (to: Record<string, string>): ActorDriver => async (activation) => {
	const target = to[nameOf(activation.actor)];
	if (target !== undefined) await activation.call("say", target);
};
const play = (s: Stub, given: Partial<TurnsOptions>, drivers: DriverTable): Promise<RunEnd | undefined> => turns.create(options(given)).run(s.port, drivers);
const short = (s: Stub): readonly string[] => s.log.filter((line) => /^(open|said)/.test(line)).map((line) => line.replace(/^open (\S+) (.*)$/, (_, name: string, detail: string) => `${name}${detail.includes('"slot"') ? ` ${detail}` : ""}`));
const after = { afterBlocks: ["director"] };

describe("turns: afterBlocks", () => {
	it("activates a director after the block that created its news, and not before", async () => {
		const s = stub(3, 1);
		await play(s, after, { resident: tells({ A2: "D1" }), director: idle });
		expect(short(s)).toEqual(["A1", "A2", "said A2>D1", 'D1 {"slot":"afterBlock","pass":1,"block":2}', "A3"]);
		expect(s.log.at(-1)).toBe("close A3");
	});

	it("serves news from before the pass in the slot start, and news of the last block after it", async () => {
		const s = stub(2, 1);
		s.heard.push("D1");
		await play(s, { ...after, passes: 2 }, { resident: tells({ A2: "D1" }), director: idle });
		const slots = s.log.filter((line) => line.startsWith("open D1")).map((line) => line.slice(8));
		expect(slots).toEqual(['{"slot":"start","pass":1,"block":0}', '{"slot":"afterBlock","pass":1,"block":2}', '{"slot":"afterBlock","pass":2,"block":2}']);
		expect(s.log.indexOf(`open D1 ${slots[0] ?? ""}`)).toBe(1);
	});

	it("never activates a director without news, one that may not act, or any when the run is halted", async () => {
		const quiet = stub(3, 2);
		await play(quiet, { ...after, blockSize: 2 }, { resident: idle });
		expect(short(quiet)).toEqual(["A1", "A2", "A3"]);
		const asleep = stub(2, 2);
		asleep.asleep.add("D1");
		asleep.heard.push("D1", "D2");
		await play(asleep, after, { resident: idle, director: idle });
		expect(short(asleep)).toEqual(['D2 {"slot":"start","pass":1,"block":0}', "A1", "A2"]);
		expect(asleep.heard).toEqual(["D1"]);
		const halted = stub(2, 1);
		// The run halts inside the first block: the slot after it is not served, though the director has news.
		const halting: ActorDriver = async (activation) => {
			await activation.call("say", "D1");
			halted.halted = true;
		};
		await play(halted, after, { resident: halting, director: idle });
		expect(short(halted)).toEqual(["A1", "said A1>D1"]);
	});

	it("goes one round per slot, in the definition's order: news among directors waits for the next slot", async () => {
		const s = stub(2, 2);
		s.heard.push("D1");
		const once = new Set<string>();
		const director: ActorDriver = async (activation) => {
			const name = nameOf(activation.actor);
			if (once.has(name)) return;
			once.add(name);
			await activation.call("say", name === "D1" ? "D2" : "D1");
		};
		await play(s, after, { resident: idle, director });
		expect(short(s)).toEqual(['D1 {"slot":"start","pass":1,"block":0}', "said D1>D2", "A1", 'D2 {"slot":"afterBlock","pass":1,"block":1}', "said D2>D1", "A2", 'D1 {"slot":"afterBlock","pass":1,"block":2}']);
	});

	it("builds the inputs of a slot's actors before any of them acts and lands their calls in order", async () => {
		const s = stub(1, 2);
		s.heard.push("D1", "D2");
		const slow: ActorDriver = async (activation) => {
			await new Promise((resolve) => { setTimeout(resolve, activation.actor.endsWith("1") ? 20 : 0); });
			await activation.call("say", "A1");
		};
		await play(s, after, { resident: idle, director: slow });
		expect(s.log.slice(1, 7).map((line) => line.replace(/ \{.*$/, ""))).toEqual(["open D1", "open D2", "said D1>A1", "close D1", "said D2>A1", "close D2"]);
	});

	it("fails with SWT-R011 when an actor of a slot has no driver", async () => {
		const s = stub(1, 1);
		s.heard.push("D1");
		const failure: unknown = await play(s, after, { resident: idle }).catch((error: unknown) => error);
		expect(failure instanceof SwtError ? failure.code : failure).toBe("SWT-R011");
	});
});

describe("turns: a game without afterBlocks", () => {
	it("keeps pass_started, the shuffle and every activation, with directors in the run or the option set", async () => {
		const given = { order: "seeded", blockSize: 2, passes: 2 } as const;
		const plain = stub(5, 0);
		await play(plain, given, { resident: tells({ A3: "D1" }) });
		const unused = stub(5, 2);
		await play(unused, given, { resident: tells({ A3: "D1" }) });
		expect(unused.log).toEqual(plain.log);
		const used = stub(5, 2);
		await play(used, { ...given, ...after }, { resident: tells({ A3: "D1" }), director: idle });
		expect(used.log.filter((line) => line.startsWith("pass_started"))).toEqual(plain.log.filter((line) => line.startsWith("pass_started")));
		expect(used.log.filter((line) => !/^(open|close) D1/.test(line))).toEqual(plain.log);
		expect(used.log.filter((line) => line.startsWith("open D1"))).toHaveLength(2);
	});

	it("has no default: the filled options, which the options hash is made of, hold no key afterBlocks", () => {
		expect(JSON.stringify(Default(TurnsOptions, {}))).toBe('{"passes":1,"blockSize":1,"activation":"always","order":"seeded","kinds":["resident"],"inputs":[]}');
		expect(JSON.stringify(Default(TurnsOptions, { afterBlocks: ["director"] }))).toContain('"afterBlocks":["director"]');
	});
});

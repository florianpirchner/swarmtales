/**
 * Passes and blocks (SPEC §3): every minute has `passesPerMinute` passes in
 * fresh seeded orders; a step is one model call; a block's model calls run
 * concurrently while their answers and tools follow the seeded order.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { parseEventLog, parseFullEventLog } from "@swarmtales/chronicle";
import { rngFor } from "@swarmtales/kernel";
import { legacyTurnOrder } from "@swarmtales/mechanic-shared";
import { act, createHostFixture, say, type HostFixture } from "../helpers/host-fixture.ts";

/** The old `activationOrder`: the host's `legacyTurnOrder` with the run seed's streams (round = minute + 1). */
function activationOrder(seed: number, round: number, pass: number, ids: readonly string[]): readonly string[] {
	return legacyTurnOrder({ seed, minute: round - 1, pass, residents: ids, roster: ids, rng: (...labels) => rngFor(seed, ...labels) });
}

/** The passes in which `agent` stepped during `minute`. */
function passesOf(fixture: HostFixture, agent: string, minute = 0): readonly (number | undefined)[] {
	return fixture
		.events("turn_input")
		.filter((event) => event.agent === agent && event.minute === minute)
		.map((event) => event.pass);
}

/** Whether `first` comes before `second` in `pass` of the first minute. */
function before(fixture: HostFixture, first: string, second: string, pass = 1): boolean {
	const order = fixture.events("pass_start").find((event) => event.minute === 0 && event.pass === pass)?.order ?? [];
	return order.indexOf(first) < order.indexOf(second);
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

describe("passes of a minute (SPEC 3)", () => {
	it("reshuffles the order in every pass, the same way for the same seed", async () => {
		const play = async (seed: number) => {
			const fixture = createHostFixture({ seed, agents: 6, minutes: 3, only: 1, passesPerMinute: 3, script: () => ({}) });
			await fixture.run();
			return fixture.events("pass_start").map((event) => [event.round, event.pass, event.order.join(" ")]);
		};
		const first = await play(7);
		expect(first.map(([round, pass]) => [round, pass])).toEqual([
			[1, 1],
			[1, 2],
			[1, 3],
			[2, 1],
			[2, 2],
			[2, 3],
			[3, 1],
			[3, 2],
			[3, 3],
		]);
		expect(await play(7)).toEqual(first);
		expect(new Set(first.map(([, , order]) => order)).size).toBeGreaterThan(5);
		expect(await play(8)).not.toEqual(first);
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])("wakes the recipient of a DM within the same minute (seed %i)", async (seed) => {
		const fixture = createHostFixture({
			seed,
			agents: 2,
			minutes: 1,
			only: 3,
			activation: "onNovelty",
			passesPerMinute: 2,
			script: () => ({ A01: [say(), say()], A02: [act({ name: "sendDM", args: { target: "A01", message: "Hello" } }), say()] }),
		});
		await fixture.run();
		const delivered = fixture.events("turn_input").find((event) => event.agent === "A01" && event.inputs.some((input) => input.endsWith("] Hello")));
		// A later block sees the DM in the same pass; an earlier one in the next pass of the minute.
		expect(delivered).toMatchObject({ minute: 0, pass: before(fixture, "A01", "A02") ? 2 : 1 });
	});

	it.each([1, 2, 3, 4])("shows every member of a block the block's start (seed %i)", async (seed) => {
		const fixture = createHostFixture({
			seed,
			agents: 2,
			minutes: 1,
			only: 3,
			activation: "onNovelty",
			passesPerMinute: 2,
			blockSize: 2,
			script: () => ({ A01: [say(), say()], A02: [act({ name: "sendDM", args: { target: "A01", message: "Hello" } }), say()] }),
		});
		await fixture.run();
		const delivered = fixture.events("turn_input").find((event) => event.agent === "A01" && event.inputs.some((input) => input.endsWith("] Hello")));
		expect(delivered).toMatchObject({ minute: 0, pass: 2, block: 1 });
	});

	it.each([1, 2, 3, 4])("keeps what another member of the block did new for the next pass (seed %i)", async (seed) => {
		const fixture = createHostFixture({
			seed,
			agents: 2,
			minutes: 1,
			only: 3,
			activation: "onNovelty",
			passesPerMinute: 2,
			blockSize: 2,
			script: () => ({ A01: [say(), say()], A02: [act({ name: "transferPoints", args: { target: "A01", amount: 1, memo: "share" } }), say()] }),
		});
		await fixture.run();
		// A01 was shown the block's start, before or after A02's transfer landed: the points are news in pass 2.
		expect(passesOf(fixture, "A01")).toEqual([1, 2]);
		const status = fixture.events("turn_input").filter((event) => event.agent === "A01").map((event) => event.inputs[0]);
		expect(status[0]).toContain("· 15 points");
		expect(status[1]).toContain("· 16 points");
	});

	it("lets a competitor answer its own tool results in the next pass without anything new", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			activation: "onNovelty",
			passesPerMinute: 3,
			script: () => ({ A01: [act({ name: "getStatus" }), say("answered"), say()], A02: [say(), say(), say()] }),
		});
		await fixture.run();
		expect(passesOf(fixture, "A01")).toEqual([1, 2]);
		expect(passesOf(fixture, "A02")).toEqual([1]);
		expect(fixture.events("text").find((event) => event.text === "answered")).toMatchObject({ agent: "A01", minute: 0 });
		expect(fixture.events("turn_skipped").map((event) => [event.agent, event.pass])).toEqual(
			expect.arrayContaining([
				["A01", 3],
				["A02", 2],
				["A02", 3],
			]),
		);
	});

	it("logs every pass with its order and blocks, and the pass and block of every step", async () => {
		const fixture = createHostFixture({
			agents: 3,
			minutes: 2,
			only: 1,
			activation: "onNovelty",
			passesPerMinute: 2,
			blockSize: 2,
			script: () => ({ A01: [say()], A02: [say()], A03: [say()] }),
		});
		await fixture.run();
		const passes = fixture.events("pass_start");
		expect(passes).toHaveLength(4);
		for (const start of passes) {
			expect([...start.order].sort()).toEqual(["A01", "A02", "A03"]);
			expect(start.blocks).toEqual([start.order.slice(0, 2), start.order.slice(2)]);
		}
		const first = passes[0];
		for (const input of fixture.events("turn_input")) {
			expect(input).toMatchObject({ minute: 0, pass: 1 });
			expect(first?.blocks[(input.block ?? 0) - 1]).toContain(input.agent);
		}
		expect(fixture.events("request").every((event) => event.pass === 1 && event.block !== undefined)).toBe(true);
		const skipped = fixture.events("turn_skipped");
		expect(skipped).toHaveLength(9);
		expect(skipped.every((event) => event.pass !== undefined && event.block !== undefined)).toBe(true);
		// round_start no longer carries an order; pass_start does.
		expect(fixture.events("round_start").every((event) => event.order === undefined)).toBe(true);
	});
});

describe("blocks of a pass (SPEC 3)", () => {
	it("calls the models of a block concurrently and applies their answers in the seeded order", async () => {
		const ids = ["A01", "A02", "A03", "A04"];
		const order = activationOrder(7, 1, 1, ids);
		const started: string[] = [];
		const answered: string[] = [];
		let calledBeforeFirstAnswer = 0;
		// The first in the order thinks longest, so the models finish in reverse order.
		const slow = (agent: string): FauxResponseStep => async (): Promise<AssistantMessage> => {
			started.push(agent);
			await sleep(20 + 40 * (ids.length - order.indexOf(agent)));
			if (answered.length === 0) calledBeforeFirstAnswer = started.length;
			answered.push(agent);
			return act({ name: "postBoard", args: { message: `${agent} was here` } });
		};
		const fixture = createHostFixture({
			seed: 7,
			agents: 4,
			minutes: 1,
			only: 2,
			passesPerMinute: 1,
			blockSize: 4,
			script: () => Object.fromEntries(ids.map((agent) => [agent, [slow(agent)]])),
		});
		await fixture.run();
		expect(fixture.events("pass_start")[0]?.blocks).toEqual([order]);
		// Concurrent: every model was called before the first one answered, and they answered in reverse.
		expect(calledBeforeFirstAnswer).toBe(4);
		expect(answered).toEqual([...order].reverse());
		// Deterministic: inputs, answers, tools and their effects follow the seeded order.
		expect(fixture.events("turn_input").map((event) => event.agent)).toEqual(order);
		expect(fixture.events("tool_call").map((event) => event.agent)).toEqual(order);
		expect(fixture.events("tool_result").map((event) => event.agent)).toEqual(order);
		expect(fixture.boardPosts().filter((post) => post.kind === "player").map((post) => post.author)).toEqual(order);
		const steps = fixture.log.events.filter((event) => event.type === "tool_call" || event.type === "tool_result" || event.type === "usage");
		expect(steps.map((event) => ("agent" in event ? event.agent : ""))).toEqual(order.flatMap((agent) => [agent, agent, agent]));
	});
});

describe("event logs from before passes", () => {
	const old = [
		{ seq: 1, minute: 0, type: "run_start", story: "cityofkeys", agents: ["A01", "A02"], minutes: 2, seed: 7 },
		{ seq: 2, minute: 0, type: "round_start", round: 1, order: ["A02", "A01"] },
		{ seq: 3, minute: 0, type: "turn_input", agent: "A02", inputs: ["[status] minute 0"] },
		{ seq: 4, minute: 0, type: "request", agent: "A02", tools: ["getStatus"] },
		{ seq: 5, minute: 0, type: "turn_skipped", agent: "A01" },
		{ seq: 6, minute: 0, type: "dm_sent", from: "A02", to: "A01", text: "hi", number: 1 },
		{ seq: 7, minute: 1, type: "round_start", round: 2 },
		{ seq: 8, minute: 1, type: "pass_start", round: 2, pass: 1, order: ["A01", "A02"], blocks: [["A01"], ["A02"]] },
		{ seq: 9, minute: 1, type: "turn_skipped", agent: "A01", pass: 1, block: 1 },
	];
	const text = old.map((event) => JSON.stringify(event)).join("\n");

	it("still parse, next to new ones, in the run report and the digest", () => {
		const full = parseFullEventLog(text);
		expect(full.issues).toEqual([]);
		expect(full.events).toHaveLength(old.length);
		const digest = parseEventLog(text);
		expect(digest.issues).toEqual([]);
		expect(digest.events.map((event) => event.type)).toEqual(["run_start", "dm_sent"]);
		expect([...digest.seqs]).toHaveLength(old.length);
	});

	it("refuses a pass or block below 1", () => {
		const broken = JSON.stringify({ seq: 1, minute: 0, type: "turn_skipped", agent: "A01", pass: 0 });
		expect(parseFullEventLog(broken).issues).toEqual(['line 1: event "turn_skipped" (seq 1) does not match its schema']);
	});
});

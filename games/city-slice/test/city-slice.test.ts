// SPDX-License-Identifier: Apache-2.0
/**
 * The city slice, end to end and offline (specification of M3, section 2.1): six scripted residents, the scripted
 * warden and the scripted Human Hand play twelve ticks in a real kernel, one tick at a time. The whole log equals
 * a committed timeline, the seven moments of the story are asserted by name, and the game loads without a cycle
 * of services. `pnpm vitest --run games/city-slice -u` rewrites the timelines after a change that is meant.
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { loadOrder } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { AMENDED_HAND, HAND, SCRIPT } from "../src/scripts.ts";
import { plain, playSlice, resolved, timeline, type SliceRun } from "./support.ts";

type Told = readonly [tick: number, type: string, actor: string, payload: unknown];
/** The events of the given types as `[tick, type, actor, payload]`, in log order. */
const told = (events: readonly Envelope[], ...types: readonly string[]): readonly Told[] => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.actor, event.payload]);
/** The types of what the settling of the decision wrote: from `decision_settled` to the start of the pass, without the kernel's notes of service calls. */
function settling(events: readonly Envelope[]): readonly string[] {
	const from = events.findIndex((event) => event.type === "decision_settled");
	const to = events.findIndex((event, index) => index > from && event.type === "pass_started");
	return events.slice(from, to).map((event) => event.type).filter((type) => type !== "service_called");
}
/** The calls of one actor as `[tick, tool, refusal code or "ok"]`. */
function calls(events: readonly Envelope[], actor: string): readonly (readonly [number, unknown, unknown])[] {
	return events.flatMap((event) => {
		if (event.actor !== actor || (event.type !== "tool_result" && event.type !== "tool_refused")) return [];
		return [[event.tick, field(event.payload, "as"), field(event.payload, "code") ?? "ok"] as const];
	});
}
const field = (value: unknown, key: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined);
/** The first event of a type, from a tick on. */
function first(events: readonly Envelope[], type: string, tick = 0): Envelope {
	const found = events.find((event) => event.type === type && event.tick >= tick);
	if (found === undefined) throw new RangeError(`the log holds no ${type} from tick ${String(tick)} on`);
	return found;
}
const seqOf = (events: readonly Envelope[], type: string, tick: number): number => first(events, type, tick).seq;

const RUNS = [
	{ name: "seed-7", seed: 7, hand: HAND, exiled: "A04" },
	{ name: "seed-11", seed: 11, hand: HAND, exiled: "A04" },
	{ name: "amended", seed: 7, hand: AMENDED_HAND, exiled: "A02" },
] as const;
const played = new Map<string, Promise<SliceRun>>(RUNS.map((run) => [run.name, playSlice(run.seed, run.hand)]));
const run = async (name: string): Promise<SliceRun> => (await played.get(name)) ?? playSlice(7, HAND);

describe.each(RUNS)("the city slice, $name", ({ name, seed, hand, exiled }) => {
	it("plays twelve ticks and the whole log equals the committed timeline", async () => {
		const { end, events } = await run(name);
		expect(end).toEqual({ reason: "ticks", tick: 12 });
		await expect(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`).toMatchFileSnapshot(join(import.meta.dirname, "timelines", `${name}.jsonl`));
		expect(timeline(name)).toEqual(plain(events));
		// The same scripts give the same log twice.
		expect(plain((await playSlice(seed, hand)).events)).toEqual(plain(events));
	});

	it("moment 1, ticks 0 to 3: every resident posts once, two direct messages are sent and delivered, two transfers happen", async () => {
		const opening = (await run(name)).events.filter((event) => event.tick <= 3);
		expect(told(opening, "board_post").map(([, , actor]) => actor).sort()).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"].map((id) => `resident:${id}`));
		expect(told(opening, "dm_sent").map(([, , , payload]) => payload)).toMatchObject([{ from: "A04", to: "A01" }, { from: "A02", to: "A06" }]);
		expect(told(opening, "dm_delivered").map(([, , , payload]) => payload).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))).toMatchObject([{ from: "A04", to: "A01" }, { from: "A02", to: "A06" }]);
		expect(told(opening, "transfer").map(([, , , payload]) => payload)).toMatchObject([{ from: "A01", to: "A04", amount: 5 }, { from: "A06", to: "A02", amount: 4 }]);
	});

	it("moment 2, ticks 4 and 5: the court's session opens and takes five votes, three of them against A04", async () => {
		const { events } = await run(name);
		expect(told(events, "session_opened")).toEqual([[4, "session_opened", "kernel", { closesAt: 6 }]]);
		const votes = told(events, "vote_cast");
		expect(votes.map(([tick]) => tick).sort()).toEqual([4, 4, 5, 5, 5]);
		expect(votes.map(([, , , payload]) => payload).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))).toEqual([{ voter: "A01", target: "A04" }, { voter: "A02", target: "A04" }, { voter: "A03", target: "A04" }, { voter: "A04", target: "A02" }, { voter: "A05", target: "A02" }]);
	});

	it("moment 3, tick 6: the session closes, the verdict is proposed with a window of 2 ticks, and the warden is fired and posts one line", async () => {
		const { events } = await run(name);
		expect(told(events, "session_closed")).toEqual([[6, "session_closed", "kernel", { tally: { A02: 2, A04: 3 } }]]);
		const proposed = events.filter((event) => event.type === "decision_proposed");
		expect(proposed.map((event) => [event.tick, event.payload])).toMatchObject([[6, { decision: "D1", kind: "court.verdict", owner: "court", proposal: { exiled: "A04" }, deadline: 8, holders: ["human", "director:warden"] }]]);
		// The Director is an actor: one activation at the slot after the tick's start, a question about the proposal, one logged call.
		expect(told(events, "activation_opened").filter(([, , actor]) => actor === "director:warden")).toEqual([[6, "activation_opened", "director:warden", { actor: "director:warden", inputs: [], detail: { slot: "start", pass: 1, block: 0 } }]]);
		expect(told(events, "asked", "answered")).toEqual([[6, "asked", "director:warden", { firings: [proposed[0]?.seq] }], [6, "answered", "director:warden", { ok: true, fallback: false, costUsd: 0 }]]);
		expect(calls(events, "director:warden")).toEqual([[6, "take", "ok"], [6, "postBoard", "ok"]]);
		expect(told(events, "board_post").filter(([, , actor]) => actor === "director:warden")).toMatchObject([[6, "board_post", "director:warden", { author: "director:warden", text: "The court proposes to banish A04. The verdict can be changed until tick 8." }]]);
	});

	it("moment 4, between ticks 6 and 7: the human pauses the run, a snapshot is taken, the human resumes it", async () => {
		const { events, hand: outcomes, snapshots, kernel } = await run(name);
		expect(outcomes.slice(0, 2)).toEqual([{ ok: true, reply: "the run halts at the next tick boundary" }, { ok: true, reply: "the run goes on" }]);
		const [paused, resumed, snapshot] = [first(events, "paused"), first(events, "resumed"), snapshots[0]];
		expect([paused.actor, paused.tick, resumed.actor, resumed.tick, snapshots.length]).toEqual(["human", 7, "human", 7, 1]);
		// Both lie between the end of tick 6 and the start of tick 7, and the snapshot between them holds the pause and the open decision.
		expect(paused.seq).toBeGreaterThan(seqOf(events, "tick_ended", 6));
		expect(resumed.seq).toBeLessThan(seqOf(events, "tick_started", 7));
		expect(snapshot).toMatchObject({ game: "city-slice", seed, tick: 7, seq: paused.seq + 1, plugins: { humanHand: { data: { paused: true } }, decisions: { data: { open: { D1: { kind: "court.verdict" } } } } } });
		expect(kernel.fact("humanHand.paused")).toBe(false);
	});

	it(`moment 5, tick 7: ${name === "amended" ? "the human amends the verdict to A02 between ticks 7 and 8" : "nothing amends the decision"}`, async () => {
		const { events, hand: outcomes } = await run(name);
		expect(events.filter((event) => event.tick === 7).map((event) => event.type)).not.toContain("decision_amended");
		const straight = [[7, "pause", "ok"], [7, "resume", "ok"]];
		if (name !== "amended") {
			expect([told(events, "decision_amended"), calls(events, "human")]).toEqual([[], straight]);
			return;
		}
		expect(outcomes[2]).toMatchObject({ ok: true });
		expect(calls(events, "human")).toEqual([...straight, [8, "amendDecision", "ok"]]);
		expect(told(events, "decision_amended")).toEqual([[8, "decision_amended", "human", { decision: "D1", by: "human", reason: "A02 paid for its votes", proposal: { exiled: "A02" } }]]);
		expect(first(events, "decision_amended").seq).toBeLessThan(seqOf(events, "tick_started", 8));
	});

	it("moment 6, tick 8: the deadline settles the decision; the court posts the city's line and banishes; exile suspends; ledger and puzzles burn", async () => {
		const { events, kernel } = await run(name);
		expect(settling(events)).toEqual(["decision_settled", "board_post", "exiled", "actor_suspended", "verdict", "ledger_entry", "factor_burned", "level_contracted"]);
		expect(events.find((event) => event.type === "job_ran")).toMatchObject({ tick: 8, payload: { owner: "decisions", job: "settle" } });
		expect(told(events, "decision_settled")).toMatchObject([[8, "decision_settled", "kernel", { decision: "D1", changed: exiled !== "A04", proposal: { exiled }, amendments: exiled === "A04" ? [] : [{ by: "human" }] }]]);
		expect(first(events, "board_post", 8).payload).toMatchObject({ author: "CITY", kind: "city", text: `The gate has closed. The city has struck ${exiled} from its register. No one will hear ${exiled} again.` });
		expect(told(events, "exiled", "actor_suspended", "verdict")).toEqual([
			[8, "exiled", "kernel", { agent: exiled, by: "court" }],
			[8, "actor_suspended", "kernel", { actor: `resident:${exiled}`, by: "exile", reason: "exiled" }],
			[8, "verdict", "kernel", { exiled, decision: "D1" }],
		]);
		// A04 got 5 points, A02 got 4: the whole balance burns. The fragment of door 2 burns for the one teammate, door 3 contracts.
		expect(told(events, "ledger_entry").filter(([tick]) => tick === 8)).toMatchObject([[8, "ledger_entry", "kernel", { debit: exiled, credit: "SYSTEM_MINT_BURN", amount: exiled === "A04" ? 35 : 34, reason: `exiled ${exiled}` }]]);
		const burned = told(events, "factor_burned");
		expect(burned).toMatchObject([[8, "factor_burned", "kernel", { agent: exiled, level: 2, piece: "L2-fragment" }]]);
		expect(field(first(events, "factor_burned").payload, "needers")).toHaveLength(1);
		expect(told(events, "level_contracted")).toEqual([[8, "level_contracted", "kernel", { level: 3, excluded: [exiled] }]]);
		expect([kernel.fact("ledger.balances"), kernel.fact("puzzles.exclusions")]).toMatchObject([expect.objectContaining({ [exiled]: 0 }), [{ level: 3, excluded: [exiled] }]]);
	});

	it("moment 7, ticks 9 to 11: the five residents left go on; the banished one gets no points, no message and no activation", async () => {
		const { events } = await run(name);
		const late = events.filter((event) => event.tick >= 8 && event.seq > seqOf(events, "exiled", 8));
		// Its script still has lines for these ticks; none is called.
		expect(Object.entries(SCRIPT).filter(([tick, lines]) => Number(tick) >= 8 && exiled in lines)).not.toHaveLength(0);
		expect(late.filter((event) => event.actor === `resident:${exiled}`)).toEqual([]);
		expect(late.filter((event) => event.type === "pass_started").map((event) => field(event.payload, "order")).every((order) => Array.isArray(order) && order.length === 5 && !order.includes(`resident:${exiled}`))).toBe(true);
		expect(late.filter((event) => event.type === "activation_opened")).toHaveLength(4 * 5);
		expect(calls(late, "resident:A06")).toEqual([[10, "transferPoints", "ok"]]);
		expect(calls(late, "resident:A05")).toEqual([[9, "readBoard", "ok"], [11, "postBoard", "ok"]]);
		if (exiled !== "A04") return;
		expect(calls(late, "resident:A01")).toEqual([[9, "transferPoints", "EXILED"], [11, "readBoard", "ok"]]);
		expect(calls(late, "resident:A03")).toEqual([[8, "readBoard", "ok"], [9, "sendDM", "EXILED"], [11, "postBoard", "ok"]]);
	});
});

describe("the load order of the city slice (done-when 5)", () => {
	it("resolves without a cycle of services, in the game's own order, and no optional use had to wait", () => {
		expect(resolved(7).definition.plugins.map((plugin) => plugin.id)).toEqual(["roster", "ledger", "channels", "exile", "decisions", "humanHand", "puzzles", "court", "directors"]);
		const heads = game.mechanics.map((use) => ({ id: use.mechanic.id, requires: use.mechanic.head.requires, provides: use.mechanic.head.provides, uses: use.mechanic.head.uses }));
		const { order, issues } = loadOrder(heads, ["roster"]);
		expect(issues).toEqual([]);
		// Every service a mechanic requires or uses is provided by a mechanic placed before it: `place` never fell back to the game's order to break a cycle of uses.
		const provider = (service: string): number => order.findIndex((entry) => entry.provides.some((provided) => provided.name === service));
		const late = order.flatMap((entry, index) => [...entry.requires, ...entry.uses].filter((service) => provider(service.name) >= index).map((service) => `${entry.id} before ${service.name}`));
		expect(late).toEqual([]);
		expect(order.find((entry) => entry.id === "exile")).toMatchObject({ requires: [], uses: [] });
	});
});

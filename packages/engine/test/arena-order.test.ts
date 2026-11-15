// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `order: "arena"` (decision A67, erratum J52): the old arena's draw, `legacyTurnOrder` of the old platform. It gives
 * the order of the `turn` entries at every minute of `whispers-s7.json` and `whispers-s11.json`, and it shuffles the
 * whole roster before it leaves out who may not act.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actorId, nameOf } from "@swarmtales/contracts";
import type { ActorId, OpenActivation, RunEnd, SchedulerPort } from "@swarmtales/contracts";
import { rngFor } from "@swarmtales/kernel";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { turns } from "../src/turns/turns.ts";

const OracleFile = Type.Object(
	{
		seed: Type.Integer({ description: "The seed of the recorded run." }),
		setup: Type.Object({ residents: Type.Array(Type.String({ description: "A resident's name." }), { description: "The roster." }), minutes: Type.Integer({ description: "The minutes of the run." }) }, { description: "The part of the setup this test reads." }),
		timeline: Type.Array(Type.Object({ k: Type.String({ description: "The kind of the entry." }), minute: Type.Optional(Type.Integer({ description: "The minute a minute entry starts." })), resident: Type.Optional(Type.String({ description: "The resident of a turn entry." })) }, { description: "One entry of the timeline." }), { description: "The recorded timeline." }),
	},
	{ description: "The part of an oracle file this test reads." },
);

// The order of the `turn` entries, per minute.
function fileOrders(file: string): { readonly seed: number; readonly residents: readonly string[]; readonly minutes: number; readonly orders: readonly string[] } {
	const oracle = Parse(OracleFile, JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "oracles", "whispers", file), "utf8")));
	const orders: string[][] = [];
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute ?? minute;
		if (entry.k === "turn") (orders[minute] ??= []).push(entry.resident ?? "");
	}
	return { seed: oracle.seed, residents: oracle.setup.residents, minutes: oracle.setup.minutes, orders: orders.map((order) => order.join(" ")) };
}

// A port over the residents that plays `ticks` ticks and keeps the order of every pass; `asleep` may not act.
async function orders(seed: number, residents: readonly string[], ticks: number, asleep: readonly string[] = []): Promise<readonly string[]> {
	const ids: ActorId[] = residents.map((name) => actorId("resident", name));
	const seen: string[] = [];
	let tick = 0;
	const open: SchedulerPort["open"] = (actor, inputs, detail): OpenActivation => ({ actor, tick, basis: 0, detail, inputs, tools: [], quietEnd: false, call: () => Promise.resolve({ ok: true, reply: "" }), record: (source, type, payload) => ({ seq: 0, tick, source, type, actor, payload }), close: () => undefined });
	const port: SchedulerPort = {
		seed,
		get tick() { return tick; },
		actors: { ids, ofKind: (kind) => (kind === "resident" ? ids : []), has: (id) => ids.some((known) => known === id), mayAct: (id) => !asleep.includes(nameOf(id)), shared: () => undefined },
		halted: false,
		rng: (...labels) => rngFor(seed, ...labels),
		emit: (type, payload) => {
			if (type === "pass_started" && typeof payload === "object" && payload !== null && "order" in payload && Array.isArray(payload.order)) seen.push(payload.order.map((id) => String(id).slice("resident:".length)).join(" "));
			return { seq: seen.length, tick, source: turns.id, type, actor: "kernel", payload };
		},
		beginTick: () => Promise.resolve(),
		endTick: (): Promise<RunEnd | undefined> => Promise.resolve((tick += 1) >= ticks ? { reason: "ticks", tick } : undefined),
		hasNews: () => false,
		toAct: () => undefined,
		inputsFor: () => [],
		open,
	};
	await turns.create({ passes: 1, blockSize: 1, activation: "always", order: "arena", kinds: ["resident"], inputs: [] }).run(port, { resident: () => Promise.resolve(undefined) });
	return seen;
}

describe("turns: order arena", () => {
	it("gives the order of the turn entries at every minute of whispers-s7.json and whispers-s11.json", async () => {
		for (const file of ["whispers-s7.json", "whispers-s11.json"]) {
			const recorded = fileOrders(file);
			expect(recorded.orders).toHaveLength(recorded.minutes);
			expect(await orders(recorded.seed, recorded.residents, recorded.minutes)).toEqual(recorded.orders);
		}
	});

	it("shuffles the whole roster with (order, tick + 1, pass), then leaves out who may not act", async () => {
		const roster = ["A01", "A02", "A03", "A04", "A05", "A06"];
		const drawn = rngFor(7, "order", 1, 1).shuffle(roster);
		expect(await orders(7, roster, 1, ["A03"])).toEqual([drawn.filter((name) => name !== "A03").join(" ")]);
		// Not the draw of the five who may act: the old arena drew from the whole roster.
		expect(rngFor(7, "order", 1, 1).shuffle(roster.filter((name) => name !== "A03"))).not.toEqual(drawn.filter((name) => name !== "A03"));
	});
});

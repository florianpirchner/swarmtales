// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle harness for the story games (M5-10, `12-m5-spec.md` 3.4, "How the composed setups are read"): a
 * stand-in game plays the first three minutes of `whispers-s7.json` at level 1. The stand-in knows no rule of the
 * city: one mechanic per id of `setup.mechanics`, each of which emits its own next event of the file when it is its
 * turn (after a call, on another stand-in's event, at the start and the end of a tick), and every resident tool
 * answers what the file says. So the run proves the harness, not a port: the composed setup (no options, the order
 * `custom`, which is the old arena's draw), the actors (`host`, `resident:<id>`) and the reply-less calls of a caller that
 * is no resident.
 */
import { join } from "node:path";
import type { ActorId, GameData, RandomLabel, SchedulerPort } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { rngFor } from "@swarmtales/kernel";
import { defineEvents, defineHead, defineMechanic, refuse, reply, type MechanicDefinition } from "@swarmtales/sdk";
import { Type, type TSchema } from "typebox";
import { describe, expect, it } from "vitest";
import type { Oracle, OracleEntry } from "../src/oracle/format.ts";
import { countsOf, readOracle } from "../src/oracle/read.ts";
import { runOracle } from "../src/oracle/run.ts";

const FILE = join(import.meta.dirname, "..", "..", "..", "oracles", "whispers", "whispers-s7.json");
const whispers = readOracle(FILE);
const CUT = whispers.timeline.findIndex((entry) => entry.k === "minute" && entry.minute === 3);
// The staged call `directorMinute` of the actor `script` opens every minute. The sdk stages no call before M5-03
// (`ctx.stage`, the grant of `script`), so the stand-in cannot make it and the compared copy leaves it out.
const isScript = (entry: OracleEntry): boolean => entry.k === "call" && entry.actor === "script";
const played = whispers.timeline.slice(0, CUT).filter((entry) => !isScript(entry));

// A cut file is compared without its end.
const cutOf = (timeline: readonly OracleEntry[]): Oracle => ({ ...whispers, truncated: { afterMinute: 2, reason: "the first three minutes" }, counts: countsOf(timeline), timeline: [...timeline] });

type Rule = Extract<OracleEntry, { k: "call" | "event" }>;
// What the stand-in plays: the calls and the events of the mechanics, in the file's order.
const rules = played.filter((entry): entry is Rule => entry.k === "call" || (entry.k === "event" && entry.source !== "core"));
let next = 0;
const actorOf = (actor: string): string => (actor === "kernel" ? "host" : actor);
const ids = whispers.setup.mechanics.map((mechanic) => mechanic.id);
const payload = Type.Unknown({ description: "The payload as the file holds it." });
const eventsOf = (id: string): Readonly<Record<string, TSchema>> => Object.fromEntries(whispers.timeline.flatMap((entry) => (entry.k === "event" && entry.source === id ? [[entry.type, payload]] : [])));
const sources = ids.map((id) => defineEvents(id, eventsOf(id)));

// Emits the events of `id` that come next in the file, while they are of this actor.
interface Emits {
	emit(type: string, payload: unknown): void;
}
function drain(id: string, actor: string, ctx: Emits): void {
	for (let entry = rules[next]; entry?.k === "event" && entry.source === id && entry.actor === actorOf(actor); entry = rules[next]) {
		next += 1;
		ctx.emit(entry.type, entry.payload);
	}
}

// Every resident tool answers as the file does, when its call is the next entry.
const Params = Type.Object({}, { additionalProperties: true, description: "The params as the file holds them." });
const tools = Object.fromEntries(whispers.setup.residentTools.map((tool) => [tool, { description: `${tool} of the file.`, params: Params, for: ["resident"] }]));
const answer = (tool: string): ReturnType<typeof reply> | ReturnType<typeof refuse> => {
	const entry = rules[next];
	if (entry?.k !== "call" || entry.tool !== tool) return refuse("OUT_OF_ORDER", `the file has no call of ${tool} here`);
	next += 1;
	return entry.ok ? reply(entry.reply ?? "") : refuse(entry.code ?? "REFUSED", entry.detail ?? "");
};

function standIn(id: string): MechanicDefinition {
	const head = defineHead({ id, package: `@stand-in/${id}`, summary: `The stand-in of ${id}.`, events: eventsOf(id), tools: id === "arena" ? tools : {} });
	const host = (ctx: Emits): void => {
		drain(id, "kernel", ctx);
	};
	return defineMechanic(head, {
		tools: Object.fromEntries((id === "arena" ? Object.keys(tools) : []).map((tool) => [tool, { run: () => answer(tool) }])),
		hooks: { runStarted: host, tickStarted: host, tickEnded: host },
		pipeline: {
			after: (call: { readonly actor: ActorId }, _outcome: unknown, ctx: Emits) => {
				drain(id, call.actor, ctx);
			},
		},
		listeners: (kit) =>
			sources.filter((source) => source.id !== id).flatMap((source) =>
				Object.keys(source.events).map((type) =>
					kit.listen(source, type, (_payload, ctx, event) => {
						drain(id, event.actor, ctx);
					}),
				),
			),
	});
}

// The old order of a pass (legacy `legacyTurnOrder` of `mechanics/shared/src/order.ts`): the roster shuffled with
// the labels `order`, minute + 1, pass. `turns` draws `turns`, tick[, pass], another order; until it can draw the old
// one, the stand-in plays `turns` with the old draw.
const oldTurns: typeof turns = {
	...turns,
	// Its events are those of `turns`, under its source.
	create(options) {
		const inner = turns.create(options);
		const draw = (port: SchedulerPort) => (...labels: readonly RandomLabel[]) => (labels[0] === "turns" ? port.rng("order", Number(labels[1]) + 1, labels[2] ?? 1) : port.rng(...labels));
		const handler: ProxyHandler<SchedulerPort> = { get: (port, key): unknown => (key === "rng" ? draw(port) : Reflect.get(port, key, port)) };
		return { run: (port, drivers, until) => inner.run(new Proxy(port, handler), drivers, until) };
	},
};

const installed = Object.fromEntries(ids.map((id) => [id, standIn(id)]));
const game: GameData = {
	schema: 1,
	id: "whispers-stand-in",
	residents: whispers.setup.residents,
	mechanics: ids.map((use) => ({ use })),
	grants: { resident: whispers.setup.residentTools },
	locked: whispers.setup.locked,
	scheduler: { id: "old-turns", options: { passes: 1, blockSize: 1, activation: "always", order: "seeded" } },
	end: { ticks: whispers.setup.minutes },
};
const found = async (oracle: Oracle): Promise<readonly string[]> => {
	next = 0;
	return (await runOracle(oracle, game, 1, { installed, schedulers: { "old-turns": oldTurns } })).map((mismatch) => `${String(mismatch.level)} ${mismatch.at} ${String(mismatch.index)}`);
};

describe("the oracle harness for the story games", () => {
	it("plays the first three minutes of whispers-s7.json at level 1 with the mapping", async () => {
		expect(whispers.setup.definition?.file).toBe("setup/whispers.story.json");
		expect(rules.filter((entry) => entry.k === "call").map((entry) => entry.actor)).toEqual(["resident:A01", "resident:A02", "resident:A05", "resident:A01", "resident:A04", "resident:A03"]);
		expect(await found(cutOf(played))).toEqual([]);
		expect(next).toBe(rules.length);
	});

	it("names the entry of a hand-changed copy", async () => {
		const at = played.findIndex((entry) => entry.k === "event" && entry.source === "ledger" && entry.actor === "resident:A05");
		const changed = played.map((entry, index) => (index === at && entry.k === "event" ? { ...entry, payload: { txId: "TX9", debit: "SYSTEM_MINT_BURN", credit: "A05", amount: 11, reason: "level 1 solved" } } : entry));
		expect(await found(cutOf(changed))).toEqual([`1 event ${String(at)}`]);
		const refused = played.map((entry) => (entry.k === "call" && entry.actor === "resident:A04" ? { ...entry, ok: false, code: "INCORRECT" } : entry));
		expect(await found(cutOf(refused))).toEqual([`1 call ${String(played.findIndex((entry) => entry.k === "call" && entry.actor === "resident:A04"))}`]);
	});

	// For issues 38 and 45 (an erratum of 3.1): the order `custom` of the files is the old arena's draw at every minute
	// of both seeds, and the draw of `turns` (`turns`, tick) is another order already at minute 0.
	it("finds the old arena's draw in the turn entries of whispers-s7.json and whispers-s11.json", () => {
		const roster = whispers.setup.residents;
		for (const file of ["whispers-s7.json", "whispers-s11.json"]) {
			const oracle = readOracle(join(FILE, "..", file));
			const orders = new Map<number, string[]>();
			let minute = 0;
			for (const entry of oracle.timeline) {
				if (entry.k === "minute") minute = entry.minute;
				if (entry.k === "turn") orders.set(minute, [...(orders.get(minute) ?? []), entry.resident]);
			}
			expect([...orders].filter(([at, order]) => order.join() !== rngFor(oracle.seed, "order", at + 1, 1).shuffle(roster).join())).toEqual([]);
			expect(orders.get(0)?.join()).not.toBe(rngFor(oracle.seed, "turns", 0).shuffle(roster).join());
		}
	});
});

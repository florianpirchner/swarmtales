// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ActorId, PluginPort, RandomSource, ToolCall } from "@swarmtales/contracts";
import type { MechanicContext, Shape } from "../src/mechanic/context-types.ts";
import { refuse, reply } from "../src/mechanic/definers.ts";
import { bindHooks, bindStages } from "../src/mechanic/hooks.ts";
import type { InstanceParts } from "../src/mechanic/parts.ts";

type M = Shape<{ tool: string }, { log: string[] }, Record<string, never>, Record<string, never>, [], []>;
type Ctx = MechanicContext<M>;

const random: RandomSource = {
	next: () => 0,
	int: (min) => min,
	pick<T>(items: readonly T[]): T {
		for (const item of items) return item;
		throw new RangeError("pick of an empty list");
	},
	shuffle: (items) => [...items],
};
const ACTORS: readonly ActorId[] = ["resident:A01", "resident:A02", "director:D1"];

function parts(): InstanceParts<M> {
	const port: PluginPort = {
		id: "consensus",
		source: "@acme/consensus/consensus",
		seed: 1,
		maxTicks: 9,
		tick: () => 3,
		emit: () => undefined,
		call: () => undefined,
		has: () => false,
		rng: () => random,
		actors: { ids: ACTORS, ofKind: (kind) => ACTORS.filter((id) => id.startsWith(`${kind}:`)), has: () => true, mayAct: () => true, shared: () => undefined, suspend: () => undefined, resume: () => undefined },
		schedule: { at: () => undefined },
		access: { lock: () => undefined, unlock: () => undefined, isLocked: () => false, isOpen: () => true, open: () => [] },
	};
	const options = { tool: "playMove" };
	const head = { id: "consensus", package: "@acme/consensus", summary: "A gate.", options: Type.Object({}), state: undefined, version: 1, events: {}, audiences: {}, prompts: {}, requires: [], provides: [], uses: [], tools: [], metrics: [] };
	return { port, head, options, state: { value: { log: [] } }, setup: { options, residents: ["A01", "A02"], actors: ["resident:A01", "resident:A02"], seed: 1, rng: () => random }, texts: { render: () => "" } };
}

const say = (word: string) => (ctx: Ctx): void => void ctx.state.log.push(`${word}@${String(ctx.tick)}`);

describe("bindHooks", () => {
	it("takes the three forms of a hook slot and keeps `after`", () => {
		const instance = parts();
		const hooks = bindHooks(instance, {
			runStarted: say("plain"),
			tickStarted: { run: say("placed"), after: ["grid-game"] },
			tickEnded: [say("first"), { run: say("second"), after: ["grid-game", "team-channel"] }, { run: say("third") }],
		});
		expect(hooks.runStarted?.map((entry) => Object.keys(entry))).toEqual([["run"]]);
		expect(hooks.tickStarted?.map((entry) => entry.after)).toEqual([["grid-game"]]);
		expect(hooks.tickEnded?.map((entry) => entry.after)).toEqual([undefined, ["grid-game", "team-channel"], undefined]);
		expect(hooks.inputs).toEqual([]);
		for (const entry of [...(hooks.runStarted ?? []), ...(hooks.tickStarted ?? []), ...(hooks.tickEnded ?? [])]) entry.run();
		expect(instance.state.value.log).toEqual(["plain@3", "placed@3", "first@3", "second@3", "third@3"]);
	});

	it("gives no hooks, and neither `news` nor `toAct`, for a body without them", () => {
		expect(bindHooks(parts(), undefined)).toEqual({ runStarted: [], tickStarted: [], inputs: [], tickEnded: [] });
		expect(Object.keys(bindHooks(parts(), { news: () => true }))).not.toContain("toAct");
	});

	it("calls a resident hook with the bare id, only for a resident, and answers `toAct` with actor ids", () => {
		const seen: string[] = [];
		const hooks = bindHooks(parts(), {
			turnInputs: { run: (resident, ctx) => (seen.push(resident), [`${resident} of ${ctx.mechanic}`, { kind: "board", text: "X.." }]), after: ["grid-game"] },
			news: (resident) => (seen.push(`news ${resident}`), resident === "A02"),
			toAct: (ctx) => ctx.residents.ids.slice(1),
		});
		const inputs = hooks.inputs?.[0];
		expect(inputs?.after).toEqual(["grid-game"]);
		expect(inputs?.run("resident:A01")).toEqual(["A01 of consensus", { kind: "board", text: "X.." }]);
		expect(inputs?.run("director:D1")).toEqual([]);
		expect([hooks.news?.("resident:A01"), hooks.news?.("resident:A02"), hooks.news?.("director:D1"), hooks.news?.("kernel")]).toEqual([false, true, false, false]);
		expect(seen).toEqual(["A01", "news A01", "news A02"]);
		expect(hooks.toAct?.()).toEqual(["resident:A02"]);
	});
});

describe("bindStages", () => {
	const call = (actor: ActorId): ToolCall => ({ tool: "@acme/grid/grid/playMove", name: "playMove", as: "move", owner: "grid", actor, params: { cell: 4 }, seq: 12 });

	it("shows a handler the call under the bare tool name, with the resident", () => {
		const instance = parts();
		const stages = bindStages(instance, {
			lock: (seen, ctx) => (seen.tool === ctx.options.tool ? refuse("NO_CONSENSUS", JSON.stringify(seen)) : undefined),
			rule: (seen) => (seen.resident === undefined ? refuse("NOT_A_RESIDENT") : undefined),
			after: (seen, outcome, ctx) => void ctx.state.log.push(`${seen.tool} ${String(outcome.ok)}`),
		});
		const view = { tool: "playMove", canonical: "@acme/grid/grid/playMove", owner: "grid", actor: "resident:A01", resident: "A01", params: { cell: 4 }, seq: 12 };
		expect(stages.lock?.(call("resident:A01"))).toEqual({ ok: false, code: "NO_CONSENSUS", detail: JSON.stringify(view) });
		expect(stages.lock?.({ ...call("resident:A01"), name: "look" })).toBeUndefined();
		expect([stages.rule?.(call("resident:A01")), stages.rule?.(call("human"))]).toEqual([undefined, { ok: false, code: "NOT_A_RESIDENT" }]);
		stages.after?.(call("resident:A01"), reply("done"));
		expect(instance.state.value.log).toEqual(["playMove true"]);
	});

	it("leaves out the stages a mechanic does not handle", () => {
		expect(bindStages(parts(), undefined)).toEqual({});
		expect(Object.keys(bindStages(parts(), { rule: () => undefined }))).toEqual(["rule"]);
	});
});

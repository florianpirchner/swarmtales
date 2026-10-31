/**
 * The `cores` mechanic (carve step 9, team T2, docs/design/carve-team-T2.md): every resident gets
 * a character core once, seeded, and keeps it. The deal writes `core_dealt` per resident in roster
 * order. Nobody else reads a core: the facts `cores.cores`, `cores.prose` and `cores.lines` are
 * for the app (system prompt), the gamemaker and the reports.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { coreLine, dealCores, renderCore } from "./deal.ts";
import { coresHead } from "./head.ts";
import { CoreRecord } from "./spec.ts";

export { coresHead };
export { coreLine, dealCores, renderCore };
export { CoreRecord, CoresOptions } from "./spec.ts";

type Ctx = ContextOf<typeof coresHead>;

const Slice = Type.Array(CoreRecord);
const LegacySlice = Type.Object({ cores: Type.Optional(Slice) });

/** Deals every resident's core once; a world that has them keeps them. */
function deal(ctx: Ctx): void {
	if (ctx.state.cores.size > 0) return;
	for (const [agent, core] of dealCores(ctx.options, ctx.residents.ids, (...labels) => ctx.rng(...labels))) {
		ctx.state.cores.set(agent, core);
		ctx.emit("core_dealt", { agent, bigFive: core.bigFive, drives: core.drives, ...(core.figure === undefined ? {} : { figure: core.figure }) });
	}
}

export const cores = defineMechanic(coresHead, (kit) => ({
	hooks: {
		runStarted: deal,
		// A snapshot from before the cores deals them before the next minute is played (v09).
		minuteStarted: deal,
	},
	facts: {
		cores: kit.fact(Type.Record(Type.String(), Type.Object({ bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Type.String() })), drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Type.String() })), figure: Type.Optional(Type.String()) })), (view) => Object.fromEntries(view.state.cores)),
		prose: kit.fact(Type.Record(Type.String(), Type.String()), (view) => Object.fromEntries([...view.state.cores].map(([agent, core]) => [agent, renderCore(view.options, core)]))),
		lines: kit.fact(Type.Record(Type.String(), Type.String()), (view) => Object.fromEntries([...view.state.cores].map(([agent, core]) => [agent, coreLine(core)]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => [...state.cores].map(([agent, core]) => ({ agent, bigFive: core.bigFive, drives: core.drives, ...(core.figure === undefined ? {} : { figure: core.figure }) })),
		load: (data, setup) => ({
			// Only residents of the run keep a core.
			cores: new Map(data.filter((entry) => setup.residents.includes(entry.agent)).map(({ agent, ...core }) => [agent, core])),
		}),
		// Version 0 is the old world field `cores`: the cores in roster order, absent before v09.
		migrations: { 0: (old) => Parse(LegacySlice, old).cores ?? [] },
	}),
}));

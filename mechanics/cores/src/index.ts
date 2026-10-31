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
import { CoresApi, HOOK_ORDER, WhispersEvents } from "@swarmtales/mechanic-shared";
import { coreLine, dealCores, renderCore } from "./deal.ts";
import { coresHead } from "./head.ts";
import { CoreRecord } from "./spec.ts";

export { coresHead };
export { coreLine, dealCores, renderCore };
export { CoreRecord, CoresOptions } from "./spec.ts";

type Ctx = ContextOf<typeof coresHead>;

const Slice = Type.Array(CoreRecord);
const LegacySlice = Type.Object({ cores: Type.Optional(Slice) });

/** The story's whisperer: told by `whisperer_chosen`, or read from the log of a resumed run (it is not told again). */
function whispererOf(ctx: Ctx): string | undefined {
	if (ctx.state.whisperer !== undefined) return ctx.state.whisperer;
	const chosen = ctx.log.ofType("whispers", "whisperer_chosen").at(0);
	return chosen === undefined ? undefined : Parse(WhispersEvents.events.whisperer_chosen, chosen.payload).agent;
}

/** Deals every resident's core once; a world that has them keeps them. The whisperer plays the character the story gives it. */
function deal(ctx: Ctx): void {
	if (ctx.state.cores.size > 0) return;
	const whisperer = whispererOf(ctx);
	const own = ctx.options.whispererCore;
	for (const [agent, drawn] of dealCores(ctx.options, ctx.residents.ids, (...labels) => ctx.rng(...labels))) {
		const core = own !== undefined && agent === whisperer ? own : drawn;
		ctx.state.cores.set(agent, core);
		ctx.emit("core_dealt", { agent, bigFive: core.bigFive, drives: core.drives, ...(core.figure === undefined ? {} : { figure: core.figure }) });
	}
}

export const cores = defineMechanic(coresHead, (kit) => ({
	services: [
		kit.provide(CoresApi, {
			drivesOf: (input, ctx) => {
				const core = ctx.state.cores.get(input.resident);
				return core === undefined ? null : core.drives.map((entry) => entry.drive);
			},
			cuesOf: (input, ctx) => {
				const core = ctx.state.cores.get(input.resident);
				return (core?.drives ?? []).flatMap((entry) => ctx.options.drives.find((drive) => drive.id === entry.drive)?.cues ?? []).map((word) => word.toLowerCase());
			},
		}),
	],
	listeners: [
		kit.listen(WhispersEvents, "whisperer_chosen", (payload, ctx) => {
			ctx.state.whisperer = payload.agent;
		}),
	],
	hooks: {
		// With the first act, after the whisperer is chosen and the start points are given, before its goals are dealt.
		runStarted: { order: HOOK_ORDER.runStarted.cores, run: deal },
		// A snapshot from before the cores deals them before the next minute is played (v09), before anything else of it.
		minuteStarted: { order: HOOK_ORDER.minuteStarted.cores, run: deal },
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

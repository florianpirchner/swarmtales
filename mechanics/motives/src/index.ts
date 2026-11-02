/**
 * The `motives` mechanic (carve step 9, team T2, docs/design/carve-team-T2.md): every resident gets
 * a core motive once, seeded, and keeps it. The deal writes `core_dealt` per resident in roster
 * order. Nobody else reads a core motive: the facts `motives.coreMotives`, `motives.prose` and `motives.lines` are
 * for the app (system prompt), the gamemaker and the reports.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { MotivesApi, HOOK_ORDER, WhispersApi, WhispersEvents } from "@swarmtales/mechanic-shared";
import { coreMotiveLine, dealCoreMotives, renderCoreMotive } from "./deal.ts";
import { motivesHead } from "./head.ts";
import { CoreMotiveRecord } from "./spec.ts";

export { motivesHead };
export { coreMotiveLine, dealCoreMotives, renderCoreMotive };
export { aboveAllCap, lightCount } from "./deal.ts";
export { CoreMotiveRecord, CoreMotivesOptions } from "./spec.ts";

type Ctx = ContextOf<typeof motivesHead>;

const Slice = Type.Array(CoreMotiveRecord);
const LegacySlice = Type.Object({ cores: Type.Optional(Slice) });

/** The story's whisperer: told by `whisperer_chosen`, asked of whispers (a resumed run is not told again, L2), else read from the log. */
function whispererOf(ctx: Ctx): string | undefined {
	if (ctx.state.whisperer !== undefined) return ctx.state.whisperer;
	if (ctx.has(WhispersApi)) return ctx.tryCall(WhispersApi, "whisperer", {}) ?? undefined;
	const chosen = ctx.log.ofType("whispers", "whisperer_chosen").at(0);
	return chosen === undefined ? undefined : Parse(WhispersEvents.events.whisperer_chosen, chosen.payload).agent;
}

/** Deals every resident's core motive once; a world that has them keeps them. The whisperer plays the character the story gives it. */
function deal(ctx: Ctx): void {
	if (ctx.state.coreMotives.size > 0) return;
	const whisperer = whispererOf(ctx);
	const own = ctx.options.whispererCoreMotive;
	for (const [agent, drawn] of dealCoreMotives(ctx.options, ctx.residents.ids, (...labels) => ctx.rng(...labels))) {
		const coreMotive = own !== undefined && agent === whisperer ? own : drawn;
		ctx.state.coreMotives.set(agent, coreMotive);
		ctx.emit("core_dealt", { agent, bigFive: coreMotive.bigFive, drives: coreMotive.drives, ...(coreMotive.figure === undefined ? {} : { figure: coreMotive.figure }) });
	}
}

export const motives = defineMechanic(motivesHead, (kit) => ({
	services: [
		kit.provide(MotivesApi, {
			drivesOf: (input, ctx) => {
				const coreMotive = ctx.state.coreMotives.get(input.resident);
				return coreMotive === undefined ? null : coreMotive.drives.map((entry) => entry.drive);
			},
			cuesOf: (input, ctx) => {
				const coreMotive = ctx.state.coreMotives.get(input.resident);
				return (coreMotive?.drives ?? []).flatMap((entry) => ctx.options.drives.find((drive) => drive.id === entry.drive)?.cues ?? []).map((word) => word.toLowerCase());
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
		runStarted: { order: HOOK_ORDER.runStarted.motives, run: deal },
		// A snapshot from before the core motives deals them when the run resumes (v09), before the next act is played.
		runResumed: { order: HOOK_ORDER.runResumed.motives, run: deal },
	},
	facts: {
		coreMotives: kit.fact(Type.Record(Type.String(), Type.Object({ bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Type.String() })), drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Type.String() })), figure: Type.Optional(Type.String()) })), (view) => Object.fromEntries(view.state.coreMotives)),
		prose: kit.fact(Type.Record(Type.String(), Type.String()), (view) => Object.fromEntries([...view.state.coreMotives].map(([agent, coreMotive]) => [agent, renderCoreMotive(view.options, coreMotive)]))),
		lines: kit.fact(Type.Record(Type.String(), Type.String()), (view) => Object.fromEntries([...view.state.coreMotives].map(([agent, coreMotive]) => [agent, coreMotiveLine(coreMotive)]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => [...state.coreMotives].map(([agent, coreMotive]) => ({ agent, bigFive: coreMotive.bigFive, drives: coreMotive.drives, ...(coreMotive.figure === undefined ? {} : { figure: coreMotive.figure }) })),
		load: (data, setup) => ({
			// Only residents of the run keep a core motive.
			coreMotives: new Map(data.filter((entry) => setup.residents.includes(entry.agent)).map(({ agent, ...coreMotive }) => [agent, coreMotive])),
		}),
		// Version 0 is the old world field `cores`: the core motives in roster order, absent before v09.
		migrations: { 0: (old) => Parse(LegacySlice, old).cores ?? [] },
	}),
}));

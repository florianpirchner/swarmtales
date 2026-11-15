// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `motives` mechanic: every resident gets a core motive once, seeded, and keeps it. Carried from the old
 * `mechanics/motives`. The deal writes `motive_dealt` per resident in roster order at the start of the run; the
 * whisperer, asked of `whispers` through its `/contract` when it is loaded, plays the character the game gives it.
 * Nobody in the game reads a core motive: the facts `coreMotives`, `prose` and `lines` are for the system prompt, the
 * gamemaker and the reports; `goals` reads the drives through the service `motives`. A Director's note that gives a
 * core motive away is refused by its `rule` handler on the note tools.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { WhispersService } from "@swarmtales/mechanic-whispers/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { motiveLine, dealMotives, renderMotive } from "./deal.ts";
import { motivesHead, type MotivesCtx, type MotivesView } from "./head.ts";
import { checkMotive, cuesOf } from "./note.ts";

export { MotiveDrive, MotiveTrait, Intensity, Level, MotivesEvents, MotivesService } from "./contract.ts";
export { aboveAllCap, castFor, motiveLine, dealMotives, lightCount, namedCast, renderMotive, type Motive, type Streams } from "./deal.ts";
export { motivesHead, type MotivesState, type MotivesCtx, type MotivesView } from "./head.ts";
export { checkMotive } from "./note.ts";
export { characterLeaks, type CharacterFacts } from "./rules.ts";
export { MOTIVE_LEVELS, MotiveRecord, MotivesOptions } from "./spec.ts";

// Deals every resident's core motive once; the whisperer plays the character the game gives it.
function deal(ctx: MotivesCtx): void {
	if (ctx.state.coreMotives.size > 0) return;
	const whisperer = ctx.tryCall(WhispersService, "whisperer", {}) ?? undefined;
	const own = ctx.options.whispererCoreMotive;
	for (const [agent, drawn] of dealMotives(ctx.options, ctx.residents.ids, ctx.rng)) {
		const coreMotive = own !== undefined && agent === whisperer ? own : drawn;
		ctx.state.coreMotives.set(agent, coreMotive);
		ctx.emit("motive_dealt", { agent, bigFive: coreMotive.bigFive, drives: coreMotive.drives, ...(coreMotive.figure === undefined ? {} : { figure: coreMotive.figure }) });
	}
}

const Text = Type.String({ description: "Its text" });
const Resident = Type.String({ description: "A resident id" });

// The values of the facts the gamemaker reads (A73: `LinesSchema` and `FiguresSchema` of `mechanics/city-directors/src/gamemaker/report/characters.ts`).
const facts = {
	coreMotives: {
		output: Type.Record(
			Resident,
			Type.Object(
				{
					bigFive: Type.Array(Type.Object({ axis: Type.String({ description: "The axis" }), level: Type.String({ description: "Its level" }) }, { description: "A level" }), { description: "Its level per axis" }),
					drives: Type.Array(Type.Object({ drive: Type.String({ description: "The drive" }), intensity: Type.String({ description: "Its intensity" }) }, { description: "A drive" }), { description: "Its drives" }),
					figure: Type.Optional(Type.String({ description: "The figure's id" })),
				},
				{ description: "Its core motive" },
			),
			{ description: "The core motive per resident" },
		),
		compute: (view: MotivesView) => Object.fromEntries(view.state.coreMotives),
	},
	prose: { output: Type.Record(Resident, Text, { description: "The core motive per resident, as the system prompt reads it" }), compute: (view: MotivesView) => Object.fromEntries([...view.state.coreMotives].map(([agent, coreMotive]) => [agent, renderMotive(view.options, coreMotive)])) },
	lines: { output: Type.Record(Resident, Text, { description: "The core motive per resident, in a line" }), compute: (view: MotivesView) => Object.fromEntries([...view.state.coreMotives].map(([agent, coreMotive]) => [agent, motiveLine(coreMotive)])) },
};

/**
 * The core motives: dealt at the start, read through facts and the service `motives`, guarded in a Director's note.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), whispers(spec), motives({ ...CATALOGUE, whispererCoreMotive })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const motives = defineMechanic(motivesHead, {
	services: {
		motives: {
			drivesOf: ({ resident }, ctx) => ctx.state.coreMotives.get(resident)?.drives.map((entry) => entry.drive) ?? null,
			cuesOf: ({ resident }, ctx) => cuesOf(ctx, resident),
		},
	},
	pipeline: { rule: checkMotive },
	// With the first tick, after the whisperer is chosen (load `whispers` before `motives`).
	hooks: { runStarted: deal },
	facts,
});

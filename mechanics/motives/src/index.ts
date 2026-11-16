// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `motives` mechanic: every resident gets a core motive once, seeded, and keeps it. Carried from the old
 * `mechanics/motives`. The deal is made when a fresh run is set up (`start`, decision A86), so that the system prompt
 * reads it before the run starts, and written as `motive_dealt` per resident in roster order when the run starts; the
 * whisperer, picked with `pickWhisperer` of the whispers' `/rules`, plays the character the game gives it.
 * The personas of the game's catalogue are dealt by seat from the run seed, as the old `assignPersonas` did (A95), and
 * read through the fact `personas` by the system prompt; no event is written for them.
 * Nobody in the game reads a core motive: the facts `coreMotives`, `prose` and `lines` are for the system prompt, the
 * gamemaker and the reports; `goals` reads the drives through the service `motives`. A Director's note that gives a
 * core motive away is refused by its `rule` handler on the note tools.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { motiveLine, renderMotive } from "./deal.ts";
import { Persona } from "./spec.ts";
import { motivesHead, type MotivesCtx, type MotivesView } from "./head.ts";
import { checkMotive, cuesOf } from "./note.ts";

export { MotiveDrive, MotiveTrait, Intensity, Level, MotivesEvents, MotivesService } from "./contract.ts";
export { aboveAllCap, castFor, motiveLine, dealMotives, lightCount, namedCast, renderMotive, type Motive, type Streams } from "./deal.ts";
export { motivesHead, type MotivesState, type MotivesCtx, type MotivesView } from "./head.ts";
export { checkMotive } from "./note.ts";
export { characterLeaks, type CharacterFacts } from "./rules.ts";
export { dealPersonas } from "./personas.ts";
export { MOTIVE_LEVELS, MotiveRecord, MotivesOptions, Persona } from "./spec.ts";

// Writes the deal of `start` when the run starts, one `motive_dealt` per resident in roster order.
function deal(ctx: MotivesCtx): void {
	for (const [agent, coreMotive] of ctx.state.coreMotives) {
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
	// The persona block of the system prompt (`prompt.persona` of a game, A95).
	personas: { output: Type.Record(Resident, Persona, { description: "The persona per resident, dealt by seat from the run seed" }), compute: (view: MotivesView) => Object.fromEntries(view.state.personas) },
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
	// After `whisperer_chosen` when `whispers` is loaded before `motives`, as in the oracle files.
	hooks: { runStarted: deal },
	facts,
});

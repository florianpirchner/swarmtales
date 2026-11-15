// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic `marks` of sample 5: every resident marks one other resident as a suspect. One tool (`mark`), one
 * event (`marked`), one option (`immune`) and one service (`marks`).
 */
import { SwtError } from "@swarmtales/contracts";
import { defineHead, defineMechanic, optionMismatch, refuse, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { MarksEvents, MarksService } from "./contract.ts";

const Mark = Type.Object({ by: Type.String({ description: "Who marked." }), name: Type.String({ description: "Who was marked." }) }, { additionalProperties: false, description: "One mark." });

/**
 * The head of `marks`: everything that is data, the tool included.
 *
 * @public
 */
export const marksHead = defineHead({
	id: "marks",
	package: "@swarmtales/sample-own-mechanic",
	summary: "Every resident marks one other resident as a suspect.",
	options: Type.Object(
		{ immune: Type.Array(Type.String(), { default: [], description: "The actor ids nobody may mark (`resident:A01`). An id that is no actor of the run is refused when the run is created." }) },
		{ description: "The options of marks." },
	),
	state: Type.Object({ marks: Type.Array(Mark, { description: "The marks, in the order they were made." }) }, { additionalProperties: false, description: "The state of marks." }),
	// Runs while the kernel is created, for a fresh run and a resumed one: an immune id that is no actor is SWT-G020.
	start: ({ options, actors }) => {
		const unknown = options.immune.find((id) => !actors.some((actor) => actor === id));
		if (unknown !== undefined) throw new SwtError(optionMismatch({ owner: "marks", package: "@swarmtales/sample-own-mechanic", path: "options.immune", message: `names "${unknown}", which is no actor of the run` }));
		return { marks: [] };
	},
	events: MarksEvents.events,
	provides: [MarksService],
	tools: {
		mark: {
			description: "Mark the resident you suspect. You mark once.",
			params: Type.Object({ name: Type.String({ description: "A resident id." }) }, { additionalProperties: false, description: "The arguments of mark." }),
			for: ["resident"],
		},
	},
});

/**
 * The mechanic `marks`: the tool `mark` for residents, the event `marked`, and the query `against` of the service `marks`.
 *
 * @public
 */
export const marks = defineMechanic(marksHead, {
	tools: {
		mark: {
			check: ({ name }, ctx) => {
				if (ctx.state.marks.some((one) => one.by === ctx.resident)) return refuse("ALREADY_MARKED", "You marked a resident already.");
				if (!ctx.residents.has(name) || name === ctx.resident) return refuse("NO_SUSPECT", `${name} is no other resident.`);
				return ctx.options.immune.includes(`resident:${name}`) ? refuse("IMMUNE", `${name} cannot be marked.`) : undefined;
			},
			// What the fake driver calls: one mark per resident, on another resident that is not immune.
			sample: (ctx, random) => {
				const others = ctx.residents.ids.filter((id) => id !== ctx.resident && !ctx.options.immune.includes(`resident:${id}`));
				return ctx.state.marks.some((one) => one.by === ctx.resident) || others.length === 0 ? undefined : { name: random.pick(others) };
			},
			run: ({ name }, ctx) => {
				const by = ctx.resident ?? ctx.actor;
				ctx.state.marks.push({ by, name });
				ctx.emit("marked", { by, name });
				return reply(`You marked ${name}.`, { endsTurn: true });
			},
		},
	},
	services: {
		marks: { against: ({ resident }, ctx) => ctx.state.marks.filter((one) => one.name === resident).length },
	},
});

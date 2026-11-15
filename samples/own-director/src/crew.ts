// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The mechanic `crew` of sample 6: the residents name a captain, and the choice is a decision with a window. When
 * every resident has named one, `crew` proposes the resident with the most names (a tie goes to the first in roster
 * order) as the decision `crew.captain`; the holders may amend it until its deadline, and `crew` commits the
 * proposal that stands. The tool `remark` is for the Director.
 */
import { DecisionsEvents, DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";

/**
 * The kind of the decision `crew` proposes; its proposal is `{ captain: <resident id> }`.
 *
 * @public
 */
export const CAPTAIN = "crew.captain";

const Captain = Type.Object({ captain: Type.String({ description: "The resident id of the captain." }) }, { additionalProperties: false, description: "The proposal of the decision `crew.captain`." });
const Nomination = Type.Object({ by: Type.String({ description: "Who named." }), name: Type.String({ description: "The resident named." }) }, { additionalProperties: false, description: "One nomination." });

const crewHead = defineHead({
	id: "crew",
	package: "@swarmtales/sample-own-director",
	summary: "The residents name a captain; the choice is a decision with a window.",
	requires: [DecisionsService],
	options: Type.Object({ window: Type.Integer({ minimum: 0, default: 2, description: "The ticks the holders have to amend the choice." }) }, { description: "The options of crew." }),
	state: Type.Object(
		{
			nominations: Type.Array(Nomination, { description: "The nominations, in the order they were made." }),
			captain: Type.Optional(Type.String({ description: "The captain, once the decision settled." })),
		},
		{ description: "The state of crew." },
	),
	start: () => ({ nominations: [] }),
	events: {
		nominated: Nomination,
		captain_named: Type.Object(
			{ captain: Type.String({ description: "The captain." }), changed: Type.Boolean({ description: "True when a holder changed the crew's choice." }) },
			{ additionalProperties: false, description: "The decision settled and the captain is named." },
		),
		remarked: Type.Object({ line: Type.String({ description: "The line." }) }, { additionalProperties: false, description: "The Director said a line." }),
	},
	tools: {
		nominate: {
			description: "Name the resident who should be captain. Every resident names once.",
			params: Type.Object({ name: Type.String({ description: "A resident id." }) }, { description: "The arguments of nominate." }),
			for: ["resident"],
		},
		remark: { description: "Say one line to the crew.", params: Type.Object({ line: Type.String({ description: "The line." }) }, { description: "The arguments of remark." }), for: ["steward"] },
	},
});

/**
 * The mechanic `crew`: the tool `nominate` for residents, `remark` for the Director, the event `captain_named` when
 * the decision settles, and the limit `named` that ends the run then.
 *
 * @example
 * ```ts
 * defineGame({ id: "crew", residents: 3, mechanics: [decisions({ holders: ["human"] }), crew({ window: 2 })], end: { ticks: 6 } });
 * ```
 *
 * @public
 */
export const crew = defineMechanic(crewHead, {
	tools: {
		nominate: {
			check: ({ name }, ctx) => {
				if (ctx.state.nominations.some((one) => one.by === ctx.resident)) return refuse("ALREADY_NOMINATED", "You named a captain already.");
				return ctx.residents.has(name) ? undefined : refuse("UNKNOWN_RESIDENT", `${name} is no resident.`);
			},
			sample: (ctx, random) => (ctx.state.nominations.some((one) => one.by === ctx.resident) ? undefined : { name: random.pick(ctx.residents.ids) }),
			run: ({ name }, ctx) => {
				const by = ctx.resident ?? ctx.actor;
				ctx.state.nominations.push({ by, name });
				ctx.emit("nominated", { by, name });
				if (ctx.state.nominations.length === ctx.residents.ids.length) {
					const count = (id: string): number => ctx.state.nominations.filter((one) => one.name === id).length;
					const captain = ctx.residents.ids.reduce((best, id) => (count(id) > count(best) ? id : best));
					const answer = ctx.call(DecisionsService, "propose", { kind: CAPTAIN, proposal: { captain }, window: ctx.options.window, schema: Captain });
					if (answer.committed) ctx.emit("captain_named", { captain, changed: false });
				}
				return reply(`You named ${name}.`, { endsTurn: true });
			},
		},
		remark: {
			run: ({ line }, ctx) => {
				ctx.emit("remarked", { line });
				return reply("Said.");
			},
		},
	},
	listeners: (kit) => [
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind !== CAPTAIN || settled.owner !== ctx.mechanic || !Check(Captain, settled.proposal)) return;
			ctx.state.captain = settled.proposal.captain;
			ctx.emit("captain_named", { captain: settled.proposal.captain, changed: settled.changed });
		}),
	],
	limits: { named: { summary: "Ends the run when the captain is named.", breached: (view) => (view.state.captain === undefined ? undefined : `${view.state.captain} is captain`) } },
	hooks: { toAct: (ctx) => ctx.residents.ids.filter((id) => !ctx.state.nominations.some((one) => one.by === id)) },
});

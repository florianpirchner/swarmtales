// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic `tribunal` of sample 5: it listens to `marks.marked`. When the marks against a resident reach the
 * option `threshold`, it proposes that resident's sentence as the decision `tribunal.sentence`, and it commits the
 * proposal that stands: the event `sentenced`, and the banishing through the service `exile` when a game loads it.
 */
import { DecisionsEvents, DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { defineHead, defineMechanic, type CtxOf } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { MarksEvents, MarksService } from "./contract.ts";

/**
 * The kind of the decision `tribunal` proposes; its proposal is `{ resident: <resident id> }`.
 *
 * @public
 */
export const SENTENCE = "tribunal.sentence";

const Sentence = Type.Object({ resident: Type.String({ description: "The resident to sentence." }) }, { additionalProperties: false, description: "The proposal of the decision `tribunal.sentence`." });

const tribunalHead = defineHead({
	id: "tribunal",
	package: "@swarmtales/sample-own-mechanic",
	summary: "Sentences a resident whose marks reach a threshold; the sentence is a decision with a window.",
	requires: [MarksService, DecisionsService],
	uses: [ExileService],
	options: Type.Object(
		{
			threshold: Type.Integer({ minimum: 1, default: 2, description: "The marks against a resident that bring it before the tribunal." }),
			window: Type.Integer({ minimum: 0, default: 1, description: "The ticks the holders have to amend a sentence." }),
		},
		{ description: "The options of tribunal." },
	),
	state: Type.Object({ sentenced: Type.Array(Type.String(), { description: "The sentenced residents, in order." }) }, { additionalProperties: false, description: "The state of tribunal." }),
	start: () => ({ sentenced: [] }),
	events: {
		sentenced: Type.Object(
			{
				resident: Type.String({ description: "The sentenced resident." }),
				changed: Type.Boolean({ description: "True when a holder put another resident in the place of the tribunal's choice." }),
				exiled: Type.Boolean({ description: "True when the service `exile` banished the resident." }),
			},
			{ additionalProperties: false, description: "A sentence stands and is carried out." },
		),
	},
});

// Carries a sentence out: once per resident, the banishing when `exile` is loaded, then the event.
function sentence(ctx: CtxOf<typeof tribunalHead>, resident: string, changed: boolean): void {
	if (ctx.state.sentenced.includes(resident)) return;
	ctx.state.sentenced.push(resident);
	const banished = ctx.tryCall(ExileService, "banish", { resident });
	ctx.emit("sentenced", { resident, changed, exiled: banished?.ok === true });
}

/**
 * The mechanic `tribunal`: a listener of `marks.marked`, the owner of the decision `tribunal.sentence`.
 *
 * @public
 */
export const tribunal = defineMechanic(tribunalHead, {
	listeners: (kit) => [
		kit.listen(
			MarksEvents,
			"marked",
			({ name }, ctx) => {
				if (ctx.call(MarksService, "against", { resident: name }) !== ctx.options.threshold) return;
				const answer = ctx.call(DecisionsService, "propose", { kind: SENTENCE, proposal: { resident: name }, window: ctx.options.window, schema: Sentence });
				if (answer.committed) sentence(ctx, name, false);
			},
			{ after: ["marks"] },
		),
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind !== SENTENCE || settled.owner !== ctx.mechanic || !Check(Sentence, settled.proposal)) return;
			sentence(ctx, settled.proposal.resident, settled.changed);
		}),
	],
});

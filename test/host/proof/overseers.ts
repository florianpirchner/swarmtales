/**
 * Overseer definitions for the tests of step 18 before `defineOverseer` exists (it comes with the
 * overseer scheduling, docs/design/overseer-api.md §6 step 5): the erased `OverseerDefinition` the
 * loader checks, built from a head. Nothing here calls a model or schedules anything.
 */
import { Type, type TSchema } from "typebox";
import { Clone, Default, Parse } from "typebox/value";
import type { EventSchemas, OverseerDefinition, OverseerHead, PromptKeys } from "@swarmtales/contracts";

/** The erased definition of a head, with `as` like the real one. */
export function stubOverseer<const Id extends string, O extends TSchema, S, E extends EventSchemas, const P extends PromptKeys, Out extends TSchema>(
	head: OverseerHead<Id, O, S, E, P, Out>,
): OverseerDefinition<Id, O, E> {
	const definition: OverseerDefinition<Id, O, E> = {
		id: head.id,
		summary: head.summary,
		options: head.options,
		events: head.events,
		prompts: head.prompts,
		system: head.system,
		input: head.input,
		output: head.output,
		answer: head.answer,
		model: head.model,
		lifetime: head.lifetime,
		triggers: head.triggers,
		needs: head.needs ?? [],
		limits: head.limits,
		as(name, options) {
			const { limits, ...rest } = options ?? {};
			const parsed: unknown = Parse(head.options, Default(head.options, Clone(rest)));
			return { name, overseer: definition, options: parsed, ...(limits === undefined ? {} : { limits }) };
		},
	};
	return definition;
}

/** A short overseer that rolls and amends: the shape of the design's terminator (§3.4). */
export const terminator = stubOverseer({
	id: "acme/terminator",
	summary: "Plays for the right to amend a decision.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	prompts: { "terminator/system": [], "terminator/window": ["decision", "standingOrders"], "terminator/tools/decide": [] },
	system: "terminator/system",
	input: "terminator/window",
	output: Type.Object({ reason: Type.String() }),
	answer: { tool: "decide", description: "terminator/tools/decide" },
	model: { slot: "terminator" },
	lifetime: "short",
	triggers: [{ event: "core", type: "decision_proposed" }],
	needs: ["amendDecision"],
});

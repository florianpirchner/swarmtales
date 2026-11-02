/**
 * Overseer definitions for the tests of step 18 that only need an overseer's head (names, the
 * decision gate): `defineOverseer` with a body that makes no call, so a firing logs nothing and the
 * stub never asks a model or acts.
 */
import { Type, type TSchema } from "typebox";
import { defineOverseer } from "@swarmtales/kernel";
import type { EventSchemas, OverseerDefinition, OverseerHead, PromptKeys } from "@swarmtales/contracts";

/** The definition of a head with a body that never calls. */
export function stubOverseer<const Id extends string, O extends TSchema, S, E extends EventSchemas, const P extends PromptKeys, Out extends TSchema>(head: OverseerHead<Id, O, S, E, P, Out>): OverseerDefinition<Id, O, E> {
	return defineOverseer(head, () => ({ calls: () => [], fallback: () => undefined }));
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

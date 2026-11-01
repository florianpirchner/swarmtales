/**
 * Compile-time checks of the overseer and decision types (docs/design/overseer-api.md §1-§3; `tsc`
 * runs this file, nothing executes it): an overseer head's prompts, its input with
 * `{{standingOrders}}`, its body's call variables, grant names in a story, actors, and a mechanic's
 * decisions and commits. Every misuse below is a type error.
 */
import { Type, type TSchema } from "typebox";
import { defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import type { Actor, CallVariables, EventSchemas, OverseerBody, OverseerHead, OverseerShapeOfHead, PromptKeys } from "@swarmtales/contracts";
import { stubOverseer, terminator } from "./proof/overseers.ts";

/** Infers an overseer head like `defineOverseer` will (step 5). */
function head<const Id extends string, O extends TSchema, S, E extends EventSchemas, const P extends PromptKeys, Out extends TSchema>(definition: OverseerHead<Id, O, S, E, P, Out>): OverseerHead<Id, O, S, E, P, Out> {
	return definition;
}

/** Where the probes put what they read, so nothing they read is unused. */
const seen: string[] = [];

const base = {
	id: "acme/watcher",
	summary: "Type probes.",
	options: Type.Object({}),
	state: () => undefined,
	events: { watched: Type.Object({ n: Type.Integer() }) },
	prompts: { "w/system": [], "w/input": ["minute", "standingOrders"], "w/answer": [], "w/plain": ["minute"] },
	output: Type.Object({ reason: Type.String() }),
	answer: { tool: "answer", description: "w/answer" },
	model: { slot: "default" },
	lifetime: "short",
	triggers: [{ hook: "between" }],
} as const;

export const watcher = head({ ...base, system: "w/system", input: "w/input" });

// @ts-expect-error: the system prompt must have no variables (a fixed cache prefix)
head({ ...base, system: "w/input", input: "w/input" });

// @ts-expect-error: the input prompt must take {{standingOrders}}
head({ ...base, system: "w/system", input: "w/plain" });

// @ts-expect-error: the input must be a declared prompt
head({ ...base, system: "w/system", input: "w/other" });

head({
	...base,
	system: "w/system",
	input: "w/input",
	// @ts-expect-error: the answer tool's description is a prompt without variables
	answer: { tool: "answer", description: "w/input" },
});

type Watcher = OverseerShapeOfHead<typeof watcher>;

/** `calls` returns the input's variables without `standingOrders`, which the runtime fills. */
export const body: OverseerBody<Watcher> = {
	calls: (fired, ctx) => {
		ctx.emit("watched", { n: ctx.minute });
		// @ts-expect-error: an event the overseer did not declare
		ctx.emit("other", { n: 1 });
		// @ts-expect-error: a payload that does not match the schema
		ctx.emit("watched", { n: "one" });
		const pending: number = ctx.decisions.pending().length;
		return fired.kind === "schedule" ? [{ minute: fired.minute + pending }] : [];
	},
	settle: (output) => {
		const reason: string = output.reason;
		// @ts-expect-error: the answer has no such field
		const { missing }: { readonly missing: string } = output;
		seen.push(reason, missing);
	},
	fallback: () => ({ reason: "no model" }),
};

export const vars: CallVariables<Watcher> = { minute: 3 };
// @ts-expect-error: standingOrders is the runtime's, not the body's
export const withOrders: CallVariables<Watcher> = { minute: 3, standingOrders: "" };
// @ts-expect-error: a missing variable
export const empty: CallVariables<Watcher> = {};

export const actors: readonly Actor[] = ["overseer:terminator-1", "human", "gamemaker", "script", "host", "resident:A01"];
// @ts-expect-error: an overseer acts as overseer:<name>, never under its bare name
export const bare: Actor = "terminator-1";

const Pick = Type.Object({ value: Type.Integer() });

export const decider = defineMechanic(
	{
		id: "decider",
		summary: "Decision probes.",
		options: Type.Object({}),
		state: () => undefined,
		events: {},
		prompts: { "d/tool": [] },
		decisions: { pick: Pick },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "propose",
				description: "d/tool",
				parameters: Type.Object({}),
				execute: (_params, ctx) => {
					const outcome = ctx.decide("pick", { value: 1 }, { window: 1 }, "pick");
					// @ts-expect-error: a kind the mechanic did not declare
					ctx.decide("other", { value: 1 }, { window: 1 }, "pick");
					// @ts-expect-error: a proposal off the kind's schema
					ctx.decide("pick", { value: "one" }, { window: 1 }, "pick");
					// @ts-expect-error: a commit that is not a declared kind
					ctx.decide("pick", { value: 1 }, { window: 1 }, "other");
					return reply("open" in outcome ? String(outcome.open) : "committed");
				},
			}),
		],
		commits: {
			pick: (proposal, settled) => {
				const value: number = proposal.value;
				const by: string | undefined = settled.by;
				seen.push(String(value), by ?? "");
			},
			// A commit for an undeclared kind is not a type error here (the body's type is inferred);
			// `defineMechanic` refuses it when the mechanic is bound (test/host/decisions.test.ts).
		},
	}),
);

const roller = stubOverseer({ ...base, id: "acme/roller", system: "w/system", input: "w/input" });

export const story = defineCoreStory({
	id: "names",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [decider.with()],
	overseers: [terminator.as("terminator-1"), roller.as("roller-1")],
	grants: { resident: ["propose"], human: ["amendDecision"], "terminator-1": ["amendDecision", "propose"], "roller-1": ["propose"] },
	tools: { "roller-1": { propose: { limit: { max: 1, per: "run" } } } },
	decisions: { "decider.pick": { holders: ["terminator-1", "human"], window: 2 } },
});

defineCoreStory({
	id: "typo",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [decider.with()],
	overseers: [terminator.as("terminator-1")],
	// @ts-expect-error: a grant to a name the story does not declare
	grants: { terminater: ["amendDecision"] },
});

defineCoreStory({
	id: "holders",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [decider.with()],
	grants: { human: ["amendDecision"] },
	// @ts-expect-error: a holder the story does not declare
	decisions: { "decider.pick": { holders: ["terminator-1"] } },
});

defineCoreStory({
	id: "tools",
	seed: 1,
	minutes: 1,
	residents: 2,
	mechanics: [decider.with()],
	// @ts-expect-error: a tool no mechanic and not the core defines
	grants: { human: ["amendDecisions"] },
});

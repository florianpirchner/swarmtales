/**
 * Proof mechanics of the decision gate (docs/design/overseer-api.md §3): `pot` proposes a value
 * (from a resident's tool, or from a job) and commits it; `gatekeeper` is a `lock` handler in the
 * shape of the design's contest: only the name it lets through may amend, the human always.
 */
import { Type, type Static } from "typebox";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";

export const Pick = Type.Object({ value: Type.Integer() });

const Committed = Type.Object({ value: Type.Integer(), minute: Type.Integer(), changed: Type.Boolean(), by: Type.Optional(Type.String()), decision: Type.Optional(Type.Integer()) });

export const pot = defineMechanic(
	{
		id: "pot",
		summary: "Proposes values through the decision gate.",
		options: Type.Object({
			window: Type.Integer({ default: 0, description: "The window `propose` asks for" }),
			max: Type.Optional(Type.Integer({ description: "Narrows the decision's schema to values up to this" })),
			at: Type.Optional(Type.Integer({ description: "A minute whose job proposes 100" })),
		}),
		state: (): { committed: Static<typeof Committed>[] } => ({ committed: [] }),
		events: { picked: Committed, ticked: Type.Object({}) },
		prompts: { "pot/tools/propose": [] },
		decisions: { pick: Pick },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "propose",
				description: "pot/tools/propose",
				parameters: Type.Object({ value: Type.Integer() }),
				execute: ({ value }, ctx) => {
					const max = ctx.options.max;
					const schema = max === undefined ? undefined : Type.Object({ value: Type.Integer({ maximum: max }) });
					const outcome = ctx.decide("pick", { value }, { window: ctx.options.window, ...(schema === undefined ? {} : { schema }) }, "pick");
					return reply("open" in outcome ? `open ${String(outcome.open)}` : "committed");
				},
			}),
		],
		commits: {
			pick: (proposal, settled, ctx) => {
				const entry = { value: proposal.value, minute: ctx.minute, changed: settled.changed, ...(settled.by === undefined ? {} : { by: settled.by }), ...(settled.decision === undefined ? {} : { decision: settled.decision }) };
				ctx.state.committed.push(entry);
				ctx.emit("picked", entry);
			},
		},
		hooks: {
			runStarted: (ctx) => {
				if (ctx.options.at !== undefined) ctx.schedule.at(ctx.options.at, "tick");
			},
		},
		jobs: {
			tick: (ctx) => {
				ctx.emit("ticked", {});
				ctx.decide("pick", { value: 100 }, { window: 1 }, "pick");
			},
		},
		facts: { pending: kit.fact(Type.Integer(), (view) => view.decisions.pending("pot.pick").length) },
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ committed: Type.Array(Committed) }), save: (state) => ({ committed: state.committed.map((entry) => ({ ...entry })) }), load: (data) => ({ committed: data.committed.map((entry) => ({ ...entry })) }) }),
	}),
);

/** A `lock` handler on the core tool: only `allowed` may amend; the human is let through. */
export const gatekeeper = defineMechanic(
	{ id: "gatekeeper", summary: "Locks amendments to one name.", options: Type.Object({ allowed: Type.String({ description: "The one grant name that may amend" }) }), state: () => undefined, events: {} },
	() => ({
		pipeline: {
			lock: (call, ctx) => {
				if (call.tool !== "amendDecision" || call.actor === "human") return undefined;
				return call.actor === `overseer:${ctx.options.allowed}` ? undefined : refuse("NOT_THE_WINNER", "only the winner may amend");
			},
		},
	}),
);

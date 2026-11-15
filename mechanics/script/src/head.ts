// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The head of the `script` mechanic: the game's rules and its cast ids as options, the firing state with its
 * snapshot, the three old events, the staged tool `directorMinute`, and the services it reads. The script calls no
 * command of another mechanic: every service it names is read through `uses` with a query, and a rule that needs a
 * mechanic the game did not load ends the run (old `need`).
 */
import { Type } from "typebox";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LevelPiecesService, ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, defineTool, inSchemaOrder, type CtxOf, type QueryMethodName, type ServiceInput, type ServiceOutput, type ShapeOf } from "@swarmtales/sdk";
import { Rule } from "./rules.ts";
import { DirectorSlice, FiringState } from "./state.ts";

const Id = Type.String({ description: "A resident id" });
const Ids = (what: string) => Type.Optional(Type.Array(Id, { description: what }));

/**
 * The options of the script.
 *
 * @public
 */
export const ScriptOptions = Type.Object({
	rules: Type.Array(Rule, { default: [], description: "The game's rules of the script (the old story's `director`), in the game's order." }),
	cast: Type.Array(Type.String({ description: "The id of a cast member" }), { default: [], description: "The ids of the game's cast members: a post by an inactive one is skipped." }),
});

/**
 * The time triggers of a tick, a call of the actor `script` that the script stages at every tick start (old
 * `directorMinute`).
 *
 * @public
 */
export const TimeTriggers = defineTool("directorMinute", Type.Object({}, { description: "No arguments" }));

// The old events of the Director, payload keys in the old order.
const events = {
	director_action: Type.Object(
		{
			rule: Type.String({ description: "The rule" }),
			action: Type.String({ description: "The kind of the action" }),
			actor: Type.Optional(Type.String({ description: "Who the firing is about" })),
			via: Type.Optional(Type.String({ description: "The path of a nested list" })),
			audit: Type.Optional(Type.Union([Type.Literal("NPC_LEVEL_SET"), Type.Literal("DIRECTOR_PRIVACY_BREACH")], { description: "An action the audit marks" })),
		},
		{ description: "A rule ran one of its actions" },
	),
	director_skipped: Type.Object({ rule: Type.String({ description: "The rule" }), action: Type.String({ description: "The kind of the action" }), reason: Type.String({ description: "Why" }) }, { description: "An action, or part of it, was skipped" }),
	standings_published: Type.Object(
		{
			mode: Type.Union([Type.Literal("bands"), Type.Literal("snapshot")], { description: "Bands of ids, or the whole ranking" }),
			postSeq: Type.Integer({ description: "The number of the board post" }),
			safe: Ids("The safe band"),
			edge: Ids("The edge band"),
			out: Ids("The band out"),
			exiled: Ids("The banished"),
		},
		{ description: "The standings were posted on the board" },
	),
};

/**
 * The head of `script`: everything that can be read without running a handler.
 *
 * @public
 */
export const scriptHead = defineHead({
	id: "script",
	package: "@swarmtales/mechanic-script",
	summary: "The director's rules: courier lines, factor releases, the feast, standings and petitions.",
	options: ScriptOptions,
	state: DirectorSlice,
	start: ({ options }) => new FiringState(options.rules),
	snapshot: {
		save: (state: FiringState): DirectorSlice => state.save(),
		load: (data, setup): FiringState => {
			const state = new FiringState(setup.options.rules);
			// A snapshot file sorts the keys; the slice is read field by field, so the order of the state is its own (A43).
			state.restore(inSchemaOrder(DirectorSlice, data));
			return state;
		},
	},
	events,
	prompts: { "script/tools/directorMinute": [] },
	tools: { directorMinute: { description: "script/tools/directorMinute", params: TimeTriggers.parameters, for: ["script"] } },
	// The time triggers are a call of the script: a game grants `directorMinute` to `script` (SWT-G015).
	stages: ["directorMinute"],
	uses: [ProgressionService, LevelPiecesService, ExileService, ChannelsService],
});

/**
 * The context of the hooks, listeners and tools of `script`.
 *
 * @public
 */
export type ScriptCtx = CtxOf<typeof scriptHead>;

type Used = ShapeOf<typeof scriptHead>["uses"][number];

/**
 * Reads a query of a service the script uses; a rule that needs a mechanic the game did not load ends the run.
 *
 * @param ctx - The script's context.
 * @param service - The service.
 * @param method - The query.
 * @param input - Its input.
 * @returns Its output.
 * @throws RangeError when no loaded mechanic provides the service (the kernel ends the run).
 *
 * @public
 */
export function need<A extends Used, K extends QueryMethodName<A>>(ctx: ScriptCtx, service: A, method: K, input: ServiceInput<A, K>): ServiceOutput<A, K> {
	const output = ctx.tryCall(service, method, input);
	if (output === undefined) throw new RangeError(`script: a rule needs ${service.name}.${method}, but no loaded mechanic provides ${service.name}`);
	return output;
}

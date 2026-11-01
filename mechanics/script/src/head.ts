/**
 * The head of the script mechanic (carve step 16, docs/design/carve-plan.md): the story's director
 * rules and its cast ids as options, the firing state, the three old event types and the standings
 * prompts. Every API it acts through is optional (`uses`): a story without a rule for a mechanic
 * does not need that mechanic loaded; an action whose mechanic is missing throws.
 */
import { Type } from "typebox";
import type { ApiInput, ApiMethodName, ApiOutput, ContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, ExileApi, LedgerApi, PetitionsApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { Rule } from "./rules.ts";
import { FiringState } from "./state.ts";

const Id = Type.String();

export const ScriptOptions = Type.Object({
	rules: Type.Array(Rule, { default: [], description: "The story's director rules (`story.director`), in the story's order." }),
	cast: Type.Array(Type.String(), { default: [], description: "The ids of the story's cast members (`Object.keys(story.cast)`): a post by an inactive one is skipped." }),
});

/** The old events of the director, payload keys in the old order (chronicle event-schema.ts). */
const events = {
	director_action: Type.Object({
		rule: Type.String(),
		action: Type.String(),
		actor: Type.Optional(Id),
		via: Type.Optional(Type.String()),
		audit: Type.Optional(Type.Union([Type.Literal("NPC_LEVEL_SET"), Type.Literal("DIRECTOR_PRIVACY_BREACH")])),
	}),
	director_skipped: Type.Object({ rule: Type.String(), action: Type.String(), reason: Type.String() }),
	standings_published: Type.Object({
		mode: Type.Union([Type.Literal("bands"), Type.Literal("snapshot")]),
		postSeq: Type.Integer(),
		safe: Type.Optional(Type.Array(Id)),
		edge: Type.Optional(Type.Array(Id)),
		out: Type.Optional(Type.Array(Id)),
		exiled: Type.Optional(Type.Array(Id)),
	}),
};

const prompts = {
	"tools/directorMinute": [],
	"script/standings-bands": ["minute", "safe", "edge", "out"],
	"script/standings-bands-exiled": ["minute", "safe", "edge", "out", "exiled"],
	"script/standings-snapshot": ["minute", "rows"],
	"script/standings-row": ["rank", "agent", "points", "level"],
} as const;

export const scriptHead = defineHead({
	id: "script",
	summary: "The director's rules: courier lines, factor releases, the feast, standings and petitions.",
	options: ScriptOptions,
	state: ({ options }) => new FiringState(options.rules),
	events,
	prompts,
	uses: [ChannelsApi, ProgressionApi, CastApi, PetitionsApi, LedgerApi, PuzzlesApi, ExileApi],
});

export type ScriptCtx = ContextOf<typeof scriptHead>;
type Used = NonNullable<(typeof scriptHead)["uses"]>[number];

/** A method of an API the script uses; a rule that needs a mechanic the story did not load is a story error. */
export function need<A extends Used, K extends ApiMethodName<A>>(ctx: ScriptCtx, api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K> {
	const output = ctx.tryCall(api, method, input);
	if (output === undefined) throw new Error(`script: a rule needs ${api.name}.${method}, but no loaded mechanic provides ${api.name}`);
	return output;
}

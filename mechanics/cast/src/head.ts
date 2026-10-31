/**
 * The head of the cast mechanic (carve step 9, team T2): figures the script plays, their escrow,
 * collections and lotteries. Declared apart so the helpers in the other files can type their
 * context with it.
 */
import { Type, type Static } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, CastEvents, CastExtrasApi, ChannelsApi, LedgerApi, ProgressionApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import { CastRegistry } from "./registry.ts";

const Id = Type.String();

/** The events cast writes besides the shared `cast_dm`, payloads in the golden key order. */
const events = {
	cast_level_set: Type.Object({ cast: Id, level: Type.Integer(), audit: Type.Literal("NPC_LEVEL_SET") }),
	cast_revealed: Type.Object({ cast: Id }),
	cast_retired: Type.Object({ cast: Id }),
	...CastEvents.events,
	collection_started: Type.Object({ into: Id, cast: Id, first: Type.Integer(), untilMinute: Type.Integer() }),
	collection_shortened: Type.Object({ into: Id, untilMinute: Type.Integer() }),
	collection_revealed: Type.Object({ into: Id, cast: Id, entries: Type.Integer(), postSeq: Type.Integer(), audit: Type.Literal("DIRECTOR_PRIVACY_BREACH") }),
	lottery_drawn: Type.Object({ into: Id, candidates: Type.Array(Id), winner: Id }),
};

const options = Type.Object({
	members: Type.Record(
		Type.String(),
		Type.Object({
			level: Type.Integer({ description: "The public level shown for the cast member (`listAgents`)." }),
			hidden: Type.Optional(Type.Boolean({ description: "Whether the member is invisible until it is revealed." })),
			escrow: Type.Optional(Type.Integer({ minimum: 0, description: "Points pre-funded from the system account at run start for escrow payments." })),
		}),
		{ default: {}, description: "The story's cast members by id (the story's `cast`)." },
	),
	collections: Type.Array(Type.String(), { default: [], description: "The collections the story's rules can start, in the order of the rules: windows that end after a solve are shortened in this order (otherwise in the order they started)." }),
});

const prompts = {
	"cast/collection-entry": ["index", "from", "minute", "text"],
	"cast/collection-empty": [],
} as const;

/** What cast keeps: the members and collections, and which members have their escrow. */
export interface CastState {
	readonly registry: CastRegistry;
	/** Members whose escrow account was opened (and funded) already. */
	readonly funded: Set<string>;
}

/** What both heads share. */
const common = {
	id: "cast",
	summary: "The cast: figures, their escrow, collections and lotteries.",
	options,
	state: ({ options: given }: { readonly options: Static<typeof options> }): CastState => ({ registry: new CastRegistry(given.members), funded: new Set() }),
	events,
	prompts,
	requires: [ChannelsApi, ProgressionApi, LedgerApi],
	uses: [ReceiptsApi],
} as const;

/** The shape of the carve plan (test/mechanics/packages.test.ts pins it): the shared `CastApi` and, since round 3, `CastExtrasApi`. */
export const castHead = defineHead({ ...common, provides: [CastApi, CastExtrasApi] });

/** The head the mechanic runs with (the same APIs as `castHead`). */
export const castWorkHead = defineHead({ ...common, provides: [CastApi, CastExtrasApi] });

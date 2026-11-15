// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `names` mechanic: its options (carried), its state with the snapshot, its event, prompts and tool. */
import { Type, type Static } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { defineHead, inSchemaOrder, type CtxOf, type StateSetup, type ToolCtxOf } from "@swarmtales/sdk";
import type { NameEntry, NamesState } from "./book.ts";

/**
 * The options of the names (carried, old `namesHead.options`).
 *
 * @public
 */
export const NamesOptions = Type.Object(
	{
		untilMinute: Type.Integer({ minimum: 0, default: 2, description: "The minute at whose start the city names whoever has not chosen." }),
		announcement: Type.String({ description: "Added to the first task while a resident may choose; placeholder {untilMinute}. Required: the story's text (R2-D17); an empty text says nothing on purpose." }),
		fallbackWords: Type.Array(Type.String({ minLength: 1, description: "A word of a name the city gives" }), {
			minItems: 1,
			default: ["Stone", "Ash", "Reed", "Flint", "Moss", "Wren"],
			description: "Words of the names the city gives, letters only, so a name stays within 16 characters.",
		}),
		reserved: Type.Array(Type.String({ description: "A reserved name" }), { default: [], description: "Names nobody may take besides the system authors: the cast, the city." }),
		off: Type.Boolean({
			default: false,
			description: "The off switch: a run that keeps IDs (a story without names, `--no-names`, a run that starts past the first level). The book provides identity with no names, `chooseName` stays locked, nothing is announced.",
		}),
	},
	{ description: "The options of the names" },
);

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Entry = Type.Object({ agent: Id, name: Type.String({ description: "The name" }), fallback: Type.Boolean({ description: "Given by the city at the deadline" }) }, { description: "One resident's name" });
const NamesSlice = Type.Object(
	{
		entries: Type.Array(Entry, { description: "The names, in the order they were given" }),
		settled: Type.Boolean({ description: "The city named whoever had none" }),
		off: Type.Optional(Type.Boolean({ description: "The run plays without names" })),
		shown: Type.Array(Type.Object({ agent: Id, level: Type.Integer({ description: "The level" }) }, { description: "One task read" }), { description: "The level whose task each resident last read" }),
	},
	{ description: "The names and the tasks read" },
);

function save(state: NamesState): Static<typeof NamesSlice> {
	return {
		entries: [...state.entries.values()].map(({ agent, name, fallback }) => ({ agent, name, fallback })),
		settled: state.settled,
		...(state.active ? {} : { off: true }),
		shown: [...state.shown].map(([agent, level]) => ({ agent, level })),
	};
}

// A snapshot file sorts the keys: the slice comes back in the order of its schema (A43).
function load(data: Static<typeof NamesSlice>, setup: StateSetup<typeof NamesOptions>): NamesState {
	const slice = inSchemaOrder(NamesSlice, data);
	const entries = new Map(slice.entries.map(({ agent, name, fallback }): [string, NameEntry] => [agent, { agent, name, fallback }]));
	return { ids: setup.residents, entries, settled: slice.settled, active: slice.off !== true, shown: new Map(slice.shown.map(({ agent, level }) => [agent, level])) };
}

/**
 * The head of the names: everything that can be read without running a handler.
 *
 * @public
 */
export const namesHead = defineHead({
	id: "names",
	package: "@swarmtales/mechanic-names",
	summary: "Names residents chose, for texts and arguments.",
	options: NamesOptions,
	state: NamesSlice,
	start: (setup: StateSetup<typeof NamesOptions>): NamesState => ({ ids: setup.residents, entries: new Map(), settled: false, active: !setup.options.off, shown: new Map() }),
	snapshot: { save, load },
	events: { name_chosen: Type.Object({ agent: Id, name: Type.String({ description: "The name" }), fallback: Type.Boolean({ description: "Given by the city at the deadline" }) }, { description: "A resident has a name" }) },
	prompts: {
		"names/tools/chooseName": [],
		"names/replies/name-chosen": ["name"],
		"names/replies/locked": [],
		"names/status/you-are": ["agent"],
		"names/notices/name-announced": ["agent", "name"],
		"names/notices/name-fallback": ["name"],
	},
	tools: {
		chooseName: { description: "names/tools/chooseName", params: Type.Object({ name: Type.String({ description: "Your name, e.g. Mira", minLength: 1, maxLength: 40 }) }), for: ["resident"] },
	},
	provides: [IdentityService],
	// The pieces of a password stay as written, the city announces on the board, the banished read no name line, and
	// the choose-name line goes under a new task: each when a provider is loaded.
	uses: [PuzzlesService, ChannelsService, ExileService, ProgressionService],
});

/**
 * The context of the names' hooks, handlers and services.
 *
 * @public
 */
export type NamesCtx = CtxOf<typeof namesHead>;

/**
 * The context of the names' tool.
 *
 * @public
 */
export type NamesToolCtx = ToolCtxOf<typeof namesHead>;

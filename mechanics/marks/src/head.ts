// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `marks` mechanic: its options (carried), its state with the snapshot, its event and its prompts. */
import { Type, type Static } from "typebox";
import { AllowanceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, inSchemaOrder, type CtxOf } from "@swarmtales/sdk";
import type { MarksState } from "./book.ts";

const count = (description: string) => Type.Integer({ minimum: 0, description });
const Prices = Type.Object(
	{ board: count("Marks a board post costs."), group: count("Marks a group post costs."), dm: count("Marks a DM costs."), receipt: Type.Optional(count("Marks a shown receipt costs; 1 when left out.")) },
	{ description: "Marks per channel." },
);
const Refill = Type.Object({ marks: count("Marks that come back."), everyMinutes: count("Ticks between two refills.") }, { description: "Marks regained on a level, up to its allowance." });
const Range = Type.Object(
	{
		fromLevel: count("The first level of the range."),
		perLevel: Type.Optional(count("The range's allowance; the base rules' when left out.")),
		prices: Type.Optional(Prices),
		refill: Type.Optional(Refill),
	},
	{ description: "A level range with its own allowance, prices and refill." },
);
const Rules = Type.Object(
	{
		fromLevel: count("The first level marks apply on."),
		perLevel: Type.Optional(count("The allowance per level, reset whenever a resident changes level.")),
		perRun: Type.Optional(count("One allowance for the whole run instead, never reset and never refilled (Whispers).")),
		prices: Prices,
		ranges: Type.Optional(Type.Array(Range, { description: "Later level ranges, ascending." })),
	},
	{ description: "The game's message allowance." },
);

const Id = Type.String({ description: "A resident id, for example `A01`" });
const AllowanceRow = Type.Object(
	{
		agent: Id,
		level: Type.Integer({ description: "The level it is the allowance of" }),
		remaining: Type.Number({ description: "The marks left" }),
		since: Type.Optional(Type.Integer({ description: "The tick up to which the refill is booked" })),
	},
	{ description: "One resident's allowance" },
);
const MarksSlice = Type.Object(
	{
		allowances: Type.Array(AllowanceRow, { description: "The allowances, in the order they were first booked" }),
		shown: Type.Array(Type.Object({ agent: Id, level: Type.Integer({ description: "The level" }) }, { description: "One task read" }), { description: "The level whose task each resident last read" }),
	},
	{ description: "The allowances and the tasks read" },
);
const Channel = Type.Union([Type.Literal("board"), Type.Literal("group"), Type.Literal("dm"), Type.Literal("receipt")], { description: "What was paid for" });

function save(state: MarksState) {
	return {
		allowances: [...state.allowances].map(([agent, { level, remaining, since }]) => ({ agent, level, remaining, ...(since === undefined ? {} : { since }) })),
		shown: [...state.shown].map(([agent, level]) => ({ agent, level })),
	};
}

// A snapshot file sorts the keys: the slice comes back in the order of its schema (A43).
function load(data: Static<typeof MarksSlice>): MarksState {
	const slice = inSchemaOrder(MarksSlice, data);
	return {
		allowances: new Map(slice.allowances.map(({ agent, level, remaining, since }) => [agent, { level, remaining, ...(since === undefined ? {} : { since }) }])),
		shown: new Map(slice.shown.map(({ agent, level }) => [agent, level])),
	};
}

/**
 * The options of the marks (carried): the game's rules, the allowance of single levels and the start level.
 *
 * @public
 */
export const MarksOptions = Type.Object(
	{
		rules: Type.Optional(Rules),
		levels: Type.Array(Type.Object({ level: Type.Integer({ minimum: 1, description: "The level." }), perLevel: count("Its allowance, in place of the rules'.") }, { description: "One level's allowance." }), {
			default: [],
			description: "Allowances of single levels (the game's `levels[].marks.perLevel`).",
		}),
		startLevel: Type.Integer({ minimum: 1, default: 1, description: "The level every resident is on where no progression mechanic answers `levelOf`." }),
	},
	{ description: "The options of the marks" },
);

/**
 * The head of the marks: everything that can be read without running a handler.
 *
 * @public
 */
export const marksHead = defineHead({
	id: "marks",
	package: "@swarmtales/mechanic-marks",
	summary: "The marks a message costs and their refill.",
	options: MarksOptions,
	state: MarksSlice,
	start: (): MarksState => ({ allowances: new Map(), shown: new Map() }),
	snapshot: { save, load },
	events: {
		marks_spent: Type.Object({ agent: Id, channel: Channel, remaining: Type.Number({ description: "The marks left" }) }, { description: "A resident paid for a message or a shown receipt" }),
	},
	prompts: {
		"marks/status/marks": ["remaining", "budget"],
		"marks/task/marks-level": ["budget", "board", "group", "dm", "receipt"],
		"marks/task/marks-level-refill": ["budget", "board", "group", "dm", "receipt", "regain"],
		"marks/task/marks-run": ["budget", "board", "group", "dm", "receipt"],
	},
	// The level of a resident, and whether a group is the city's (a post in it is free): each when a provider is loaded.
	uses: [ProgressionService, ChannelsService],
	provides: [AllowanceService],
});

/**
 * The context of the marks' hooks, handlers and services.
 *
 * @public
 */
export type MarksCtx = CtxOf<typeof marksHead>;

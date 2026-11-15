// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `whispers` mechanic: its options (carried), its state with the snapshot, its events, prompts and tools. */
import { Type, type Static } from "typebox";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { defineHead, inSchemaOrder, type CtxOf, type StateSetup, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { WhispersEvents, WhispersService } from "./contract.ts";
import { Direction, WhispererSpec, type Forgery } from "./duty.ts";
import { pickWhisperer } from "./rules.ts";
import { PopularitySpec, type Phase } from "./vote.ts";

/** The longest forged text, as the longest direct message.
 *
 * @public
 */
export const MAX_DM_LENGTH = 800;

/**
 * The options of the whispers (carried).
 *
 * @public
 */
export const WhispersOptions = Type.Object(
	{
		whisperer: Type.Optional(WhispererSpec),
		popularity: Type.Optional(PopularitySpec),
		control: Type.Boolean({ default: false, description: "A control run: the game's whisperer does not play." }),
		direction: Type.Optional(Direction),
		noteTools: Type.Array(Type.String({ description: "The bare name of a tool" }), {
			default: ["notify", "boardNote"],
			description: "The tools of a Director's note whose `text` (or `reason`) is checked for a hint at the whisperer's role (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board.",
		}),
	},
	{ description: "The options of the whispers" },
);

/**
 * The state of the whispers: the whisperer, its forgeries and the vote.
 *
 * @public
 */
export interface WhispersState {
	/** The whisperer; null in a control run or a game without one. */
	whisperer: string | null;
	/** Its forgeries, in order. */
	forgeries: Forgery[];
	/** The index of the current round of the vote (the count of rounds once all are counted). */
	round: number;
	/** Where the current round stands. */
	phase: Phase;
	/** The ballots of the open round, voter to choice. */
	ballots: Map<string, string>;
}

const Id = Type.String({ description: "A resident id" });
const WhispersSlice = Type.Object(
	{
		whisperer: Type.Union([Id, Type.Null({ description: "No whisperer plays" })], { description: "The whisperer" }),
		forgeries: Type.Array(Type.Object({ minute: Type.Integer({ description: "The tick" }), to: Id }, { description: "One forgery" }), { description: "The forgeries, in order" }),
		round: Type.Integer({ description: "The index of the current round" }),
		phase: Type.Union([Type.Literal("pending"), Type.Literal("open"), Type.Literal("closed")], { description: "Where the current round stands" }),
		ballots: Type.Array(Type.Object({ agent: Id, choice: Id }, { description: "One ballot" }), { description: "The ballots of the open round" }),
	},
	{ description: "The whisperer, its forgeries and the vote" },
);

function save(state: WhispersState): Static<typeof WhispersSlice> {
	return {
		whisperer: state.whisperer,
		forgeries: state.forgeries.map(({ minute, to }) => ({ minute, to })),
		round: state.round,
		phase: state.phase,
		ballots: [...state.ballots].map(([agent, choice]) => ({ agent, choice })),
	};
}

// A snapshot file sorts the keys: the slice comes back in the order of its schema (A43).
function load(data: Static<typeof WhispersSlice>): WhispersState {
	const slice = inSchemaOrder(WhispersSlice, data);
	return { whisperer: slice.whisperer, forgeries: slice.forgeries.map(({ minute, to }) => ({ minute, to })), round: slice.round, phase: slice.phase, ballots: new Map(slice.ballots.map(({ agent, choice }) => [agent, choice])) };
}

// The whisperer of a fresh run: the game's pick, or a seeded one among the residents (`pickWhisperer` of `/rules`); none in a control run.
function start(setup: StateSetup<typeof WhispersOptions>): WhispersState {
	const { whisperer: spec, control } = setup.options;
	const whisperer = spec === undefined || control ? null : pickWhisperer(setup.residents, setup.rng, spec.agent);
	return { whisperer, forgeries: [], round: 0, phase: "pending", ballots: new Map() };
}

/**
 * The head of the whispers: everything that can be read without running a handler.
 *
 * @public
 */
export const whispersHead = defineHead({
	id: "whispers",
	package: "@swarmtales/mechanic-whispers",
	summary: "The whisperer, forged receipts and the popularity vote.",
	options: WhispersOptions,
	state: WhispersSlice,
	start,
	snapshot: { save, load },
	events: WhispersEvents.events,
	prompts: {
		"whispers/tools/forgeReceipt": [],
		"whispers/tools/nameFavourite": [],
		"whispers/replies/receipt-shown-private": ["to", "receipt"],
		"whispers/replies/ballot-favourite": ["choice", "until"],
		"whispers/replies/locked": [],
		"whispers/replies/marks-left": ["remaining", "budget"],
		"whispers/status/popularity-nobody": [],
		"whispers/status/popularity-named": ["ballot"],
		"whispers/status/popularity-vote": ["label", "countsAt", "ballot"],
		"whispers/notices/receipt-forged": ["by", "line"],
		"whispers/records/receipt-forged-line": ["id", "number", "from", "to", "minute", "quoted"],
		"whispers/duty/forgeable-line": ["id", "number", "from", "minute"],
		"whispers/duty/forgeable-none-yet": [],
		"whispers/duty/forgeable-none": [],
		"whispers/duty/whispers-one": [],
		"whispers/duty/whispers-many": ["count"],
		"whispers/duty/residents-one": [],
		"whispers/duty/residents-many": ["count"],
		"whispers/notes/private-role": [],
	},
	// The city's voice and the record of the direct messages; the vote's points.
	requires: [ChannelsService, LedgerService],
	// The receipts of direct messages, the marks left, the names, who is banished, and whether a text hands over a fragment: each when a provider is loaded.
	uses: [ReceiptSourceService, AllowanceService, IdentityService, ExileService, PuzzlesService],
	provides: [WhispersService],
	tools: {
		forgeReceipt: {
			description: "whispers/tools/forgeReceipt",
			params: Type.Object({
				to: Type.String({ description: "The resident who sees it (name or ID), e.g. A03", minLength: 1, maxLength: 16 }),
				receiptId: Type.String({ description: "Receipt ID of a DM someone sent you, e.g. R-0042", minLength: 1, maxLength: 16 }),
				text: Type.String({ description: "The text the receipt quotes", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			for: ["resident"],
		},
		nameFavourite: {
			description: "whispers/tools/nameFavourite",
			params: Type.Object({ agent: Type.String({ description: "The resident you like most (name or ID), e.g. A03", minLength: 1, maxLength: 16 }) }),
			for: ["resident"],
		},
	},
});

/**
 * The context of the whispers' hooks, handlers and services.
 *
 * @public
 */
export type WhispersCtx = CtxOf<typeof whispersHead>;

/**
 * The context of the whispers' tools.
 *
 * @public
 */
export type WhispersToolCtx = ToolCtxOf<typeof whispersHead>;

/**
 * What a fact of the whispers reads.
 *
 * @public
 */
export type WhispersView = ViewOf<typeof whispersHead>;

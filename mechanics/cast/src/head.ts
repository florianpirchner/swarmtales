// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `cast` mechanic: its options, its state, its events, services and prompts. */
import { Type } from "typebox";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { FiguresService } from "@swarmtales/mechanic-contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { CastExtrasService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, type CtxOf } from "@swarmtales/sdk";
import { CastEvents, CastService } from "./contract.ts";
import { CastSlice, freshCast } from "./registry.ts";

/**
 * The options of the cast, as on `legacy`.
 *
 * @public
 */
export const CastOptions = Type.Object({
	members: Type.Record(
		Type.String({ description: "The id of a member" }),
		Type.Object(
			{
				level: Type.Integer({ description: "The public level shown for the cast member (`listAgents`)." }),
				hidden: Type.Optional(Type.Boolean({ description: "Whether the member is invisible until it is revealed." })),
				escrow: Type.Optional(Type.Integer({ minimum: 0, description: "Points pre-funded from the system account at run start for escrow payments." })),
			},
			{ description: "One member" },
		),
		{ default: {}, description: "The story's cast members by id (the story's `cast`)." },
	),
	collections: Type.Array(Type.String({ description: "The name of a collection" }), {
		default: [],
		description: "The collections the story's rules can start, in the order of the rules: windows that end after a solve are shortened in this order (otherwise in the order they started).",
	}),
});

/**
 * The head of the cast: everything that can be read without running a handler.
 *
 * @public
 */
export const castHead = defineHead({
	id: "cast",
	package: "@swarmtales/mechanic-cast",
	summary: "The cast: figures, their escrow, collections and lotteries.",
	options: CastOptions,
	state: CastSlice,
	start: ({ options }) => freshCast(options.members),
	events: CastEvents.events,
	prompts: {
		"cast/collection-entry": ["index", "from", "minute", "text"],
		"cast/collection-empty": [],
	},
	// The escrow accounts are the ledger's, a published collection is a post of the channels.
	requires: [LedgerService, ChannelsService],
	// `figures` is what `channels` asks to hand a resident's direct message to a member (decision A72).
	provides: [CastService, CastExtrasService, FiguresService],
});

/**
 * The context of the cast's hooks, listeners and services.
 *
 * @public
 */
export type CastCtx = CtxOf<typeof castHead>;

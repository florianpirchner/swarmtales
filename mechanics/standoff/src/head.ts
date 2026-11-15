// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `standoff` mechanic: its state with the snapshot, its events, prompts, tools and the services it asks. */
import { Type } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { HeldPiecesService, RansomPriceService, StandoffEvents } from "./contract.ts";
import { STANDOFF_PROMPTS, StandoffSlice, type StandoffState } from "./model.ts";

const ClaimPieceParams = Type.Object({
	piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
	from: Type.String({ description: "The resident who held it, name or ID" }),
});

/**
 * The head of the standoff: everything that can be read without running a handler.
 *
 * @public
 */
export const standoffHead = defineHead({
	id: "standoff",
	package: "@swarmtales/mechanic-standoff",
	summary: "Pieces residents hold for others, the hand-overs the city sees, and the city's shop of the pieces of the exiled.",
	state: StandoffSlice,
	start: (): StandoffState => ({ given: [], city: [] }),
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: StandoffState) => state, load: (data): StandoffState => inSchemaOrder(StandoffSlice, data) },
	events: StandoffEvents.events,
	prompts: STANDOFF_PROMPTS,
	// A purchase burns points, the notices go through the channels, the doors come from the progression.
	requires: [LedgerService, ChannelsService, ProgressionService],
	// The pieces (`puzzles`), the price (`tribunal`), who is banished, and the names: each when a provider is loaded.
	uses: [HeldPiecesService, RansomPriceService, ExileService, IdentityService],
	tools: {
		claimPiece: { description: "standoff/tools/claimPiece", params: ClaimPieceParams, for: ["resident"] },
	},
});

/**
 * The context of the standoff's hooks, listeners and handlers.
 *
 * @public
 */
export type StandoffCtx = CtxOf<typeof standoffHead>;

/**
 * The context of the standoff's tool.
 *
 * @public
 */
export type StandoffToolCtx = ToolCtxOf<typeof standoffHead>;

/**
 * The view of the standoff's facts.
 *
 * @public
 */
export type StandoffView = ViewOf<typeof standoffHead>;

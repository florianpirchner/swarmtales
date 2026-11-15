// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `standoff` mechanic: its state with the snapshot, its events, prompts, tools and the services it asks. */
import { Type } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { HeldPiecesService, RansomPriceService, StandoffEvents, TrialRiskService } from "./contract.ts";
import { STANDOFF_PROMPTS, StandoffSlice, type StandoffState } from "./model.ts";

const ClaimPieceParams = Type.Object({
	piece: Type.String({ description: "The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate" }),
	from: Type.String({ description: "The resident who held it, name or ID" }),
});

const UltimatumParams = Type.Object({
	a: Type.String({ description: "Resident name or ID" }),
	b: Type.String({ description: "The other resident, name or ID" }),
	minutes: Type.Integer({ description: "Minutes until the deadline", minimum: 1 }),
});

/**
 * The options of `standoff`, with the old names and defaults.
 *
 * @public
 */
export const StandoffOptions = Type.Object(
	{
		ultimatum: Type.Optional(
			Type.Object(
				{
					penalty: Type.Integer({ minimum: 0, description: "Points whoever has not handed over by the deadline loses (at most what it holds)." }),
					maxMinutes: Type.Integer({ minimum: 1, description: "The longest deadline the gamemaker may give, in minutes." }),
				},
				{ description: "The gamemaker's ultimatum (P43); without it the gamemaker has none." },
			),
		),
		author: Type.String({ default: "COURIER", description: "The gamemaker's name on its notices and board posts, e.g. COURIER." }),
	},
	{ description: "The options of `standoff`" },
);

/**
 * The head of the standoff: everything that can be read without running a handler.
 *
 * @public
 */
export const standoffHead = defineHead({
	id: "standoff",
	package: "@swarmtales/mechanic-standoff",
	summary: "Pieces residents hold for others, the hand-overs the city sees, the city's shop of the pieces of the exiled, and the gamemaker's ultimatums.",
	options: StandoffOptions,
	state: StandoffSlice,
	start: (): StandoffState => ({ given: [], city: [], ultimatums: [], last: 0 }),
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: StandoffState) => state, load: (data): StandoffState => inSchemaOrder(StandoffSlice, data) },
	events: StandoffEvents.events,
	prompts: STANDOFF_PROMPTS,
	// A purchase burns points, the notices go through the channels, the doors come from the progression.
	requires: [LedgerService, ChannelsService, ProgressionService],
	// The pieces (`puzzles`), the price and the next trial (`tribunal`), who is banished, and the names: each when a provider is loaded.
	uses: [HeldPiecesService, RansomPriceService, TrialRiskService, ExileService, IdentityService],
	tools: {
		claimPiece: { description: "standoff/tools/claimPiece", params: ClaimPieceParams, for: ["resident"] },
		// The old mapping grants it only at gamemaker direction 10 in a game with ultimatums (`grantsUltimatum`).
		ultimatum: { description: "standoff/tools/ultimatum", params: UltimatumParams, for: ["gamemaker"] },
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

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `tribunal` mechanic: its options (carried), its state with the snapshot, its events, prompts and tools. */
import { Type } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { RansomPriceService, TrialRiskService } from "@swarmtales/mechanic-standoff/contract";
import { SwtError } from "@swarmtales/contracts";
import { defineHead, inSchemaOrder, optionMismatch, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { TribunalEvents } from "./contract.ts";
import { TribunalOptions } from "./spec.ts";
import { emptyTribunal, TribunalSlice, type TribunalState } from "./state.ts";

/**
 * The head of `tribunal`: everything that can be read without running a handler.
 *
 * @public
 */
export const tribunalHead = defineHead({
	id: "tribunal",
	package: "@swarmtales/mechanic-tribunal",
	summary: "Tribunal sessions, votes and faction drafts.",
	options: TribunalOptions,
	state: TribunalSlice,
	start: ({ options }): TribunalState => {
		// The faction draft is the second part of the port (M5-42); until it lands a city with factions does not load.
		if (options.factions !== undefined) throw new SwtError(optionMismatch({ owner: "tribunal", package: "@swarmtales/mechanic-tribunal", path: "options.factions", message: "is not played yet: the faction draft lands with M5-42" }));
		return emptyTribunal();
	},
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: TribunalState): TribunalState => structuredClone(state), load: (data): TribunalState => inSchemaOrder(TribunalSlice, data) },
	events: TribunalEvents.events,
	// The register and the gate, the city's voice, the points, the act and the doors.
	requires: [ExileService, ChannelsService, LedgerService, ProgressionService],
	// What the standoff asks: the price of a ransom now and who stands trial next (J121, J142).
	provides: [RansomPriceService, TrialRiskService],
	// The decision gate of the verdict and the names: each when a provider is loaded.
	uses: [DecisionsService, IdentityService],
	prompts: {
		"tribunal/tools/vote": [],
		"tribunal/replies/locked": [],
		"tribunal/replies/vote-recorded": ["target"],
		"tribunal/status/accused": ["until"],
		"tribunal/status/tribunal-vote": ["until"],
	},
	tools: {
		vote: { description: "tribunal/tools/vote", params: Type.Object({ target: Type.String({ description: "One of the accused, by name or ID, e.g. A03" }) }), for: ["resident"] },
	},
});

/**
 * The context of the tribunal's hooks, listeners and services.
 *
 * @public
 */
export type TribunalCtx = CtxOf<typeof tribunalHead>;

/**
 * The context of the tribunal's tools.
 *
 * @public
 */
export type TribunalToolCtx = ToolCtxOf<typeof tribunalHead>;

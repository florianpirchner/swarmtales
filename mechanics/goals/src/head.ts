// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `goals` mechanic: the secret goals per resident and act, their snapshot, events and prompt. */
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { MotivesService } from "@swarmtales/mechanic-motives/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ViewOf } from "@swarmtales/sdk";
import { GoalsEvents, GoalsService } from "./contract.ts";
import { GoalsOptions, GoalsSlice, type GoalsState } from "./model.ts";

/**
 * The head of the goals: everything that can be read without running a handler.
 *
 * @public
 */
export const goalsHead = defineHead({
	id: "goals",
	package: "@swarmtales/mechanic-goals",
	summary: "Secret goals per resident and act.",
	options: GoalsOptions,
	state: GoalsSlice,
	start: (): GoalsState => ({ acts: [] }),
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: GoalsState) => state, load: (data): GoalsState => inSchemaOrder(GoalsSlice, data) },
	events: GoalsEvents.events,
	prompts: { "goals/notes/private-core-motive": ["who"] },
	// The notices and the board go through the channels, the bonus through the ledger.
	requires: [ChannelsService, LedgerService],
	// Who is exiled, the drives the deal follows, the names in a Director's note: each when a provider is loaded.
	uses: [ExileService, MotivesService, IdentityService],
	provides: [GoalsService],
});

/**
 * The context of the goals' hooks, handlers and services.
 *
 * @public
 */
export type GoalsCtx = CtxOf<typeof goalsHead>;

/**
 * What a fact of the goals reads.
 *
 * @public
 */
export type GoalsView = ViewOf<typeof goalsHead>;

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `seal` mechanic: its options (carried), its state with the snapshot, its events, prompts and tools. */
import { Type } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { SealEvents } from "./contract.ts";
import { emptySeal, SealOptions, SealSlice, type SealData } from "./state.ts";

/**
 * The head of `seal`: everything that can be read without running a handler.
 *
 * @public
 */
export const sealHead = defineHead({
	id: "seal",
	package: "@swarmtales/mechanic-seal",
	summary: "The black seal auction.",
	options: SealOptions,
	state: SealSlice,
	start: (): SealData => emptySeal(),
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: SealData): SealData => structuredClone(state), load: (data): SealData => inSchemaOrder(SealSlice, data) },
	events: SealEvents.events,
	// The bids (`ledger`), the board and the notices (`channels`), the standings and the strike (`exile`). The act and
	// the tribunal's target come by their events (old `requires` of `progression` and `tribunal`, 12-m5-spec.md 2.3).
	requires: [LedgerService, ChannelsService, ExileService],
	// A name where an id goes, and the names in a reply: when `names` is loaded.
	uses: [IdentityService],
	prompts: {
		"seal/tools/bid": [],
		"seal/tools/permaDeath": [],
		"seal/replies/bid-none": ["until"],
		"seal/replies/bid-stands": ["points", "until"],
		"seal/replies/seal-broken": ["target"],
		"seal/replies/locked": [],
		"seal/status/seal-auction": ["until", "bid"],
		"seal/status/seal-bid": ["bid"],
		"seal/status/seal-bearer": [],
	},
	tools: {
		bid: { description: "seal/tools/bid", params: Type.Object({ points: Type.Integer({ description: "Whole points, 0 or more", minimum: 0 }) }), for: ["resident"] },
		permaDeath: { description: "seal/tools/permaDeath", params: Type.Object({ target: Type.String({ description: "A resident, by name or ID, e.g. A03" }) }), for: ["resident"] },
	},
});

/**
 * The context of the seal's hooks and listeners.
 *
 * @public
 */
export type SealCtx = CtxOf<typeof sealHead>;

/**
 * The context of the seal's tools.
 *
 * @public
 */
export type SealToolCtx = ToolCtxOf<typeof sealHead>;

/**
 * What a fact of the seal reads.
 *
 * @public
 */
export type SealView = ViewOf<typeof sealHead>;

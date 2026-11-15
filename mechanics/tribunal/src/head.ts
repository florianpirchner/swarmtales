// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `tribunal` mechanic: its options (carried), its state with the snapshot, its events, prompts and tools. */
import { Type } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { DecisionsService } from "@swarmtales/mechanic-decisions/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { GoalsService } from "@swarmtales/mechanic-goals/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { RansomPriceService, TrialRiskService } from "@swarmtales/mechanic-standoff/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
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
	start: (): TribunalState => emptyTribunal(),
	// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
	snapshot: { save: (state: TribunalState): TribunalState => structuredClone(state), load: (data): TribunalState => inSchemaOrder(TribunalSlice, data) },
	events: TribunalEvents.events,
	// The register and the gate, the city's voice, the points, the act and the doors.
	requires: [ExileService, ChannelsService, LedgerService, ProgressionService],
	// What the standoff asks: the price of a ransom now and who stands trial next (J121, J142).
	provides: [RansomPriceService, TrialRiskService],
	// The decision gate of the verdict, the names, and the goals that count a faction's leaders (A88): each when loaded.
	uses: [DecisionsService, IdentityService, GoalsService],
	prompts: {
		"tribunal/tools/vote": [],
		"tribunal/tools/nominate": [],
		"tribunal/tools/join": [],
		"tribunal/tools/refuse": [],
		"tribunal/replies/locked": [],
		"tribunal/replies/vote-recorded": ["target"],
		"tribunal/replies/nominate-recorded": ["agent"],
		"tribunal/replies/nominate-until": ["until"],
		"tribunal/replies/join-applied": ["leader"],
		"tribunal/replies/join-until": ["until"],
		"tribunal/replies/refuse-done": ["agent"],
		"tribunal/status/accused": ["until"],
		"tribunal/status/tribunal-vote": ["until"],
		"tribunal/status/draft-nominate": ["until", "nominated"],
		"tribunal/status/draft-nominated": ["nominee"],
		"tribunal/status/draft-leads": ["applicants", "until"],
		"tribunal/status/draft-applied": ["leader", "until"],
		"tribunal/status/draft-refused": [],
		"tribunal/status/draft-join": ["leaders", "until"],
	},
	tools: {
		vote: { description: "tribunal/tools/vote", params: Type.Object({ target: Type.String({ description: "One of the accused, by name or ID, e.g. A03" }) }), for: ["resident"] },
		nominate: { description: "tribunal/tools/nominate", params: Type.Object({ agent: Type.String({ description: "The resident you nominate, by name or ID, e.g. A03" }) }), for: ["resident"] },
		join: { description: "tribunal/tools/join", params: Type.Object({ leader: Type.String({ description: "A faction leader, by name or ID, e.g. A02" }) }), for: ["resident"] },
		refuse: { description: "tribunal/tools/refuse", params: Type.Object({ agent: Type.String({ description: "An applicant to your faction, by name or ID, e.g. A05" }) }), for: ["resident"] },
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

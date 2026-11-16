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
import { TribunalViewService } from "@swarmtales/mechanic-arena/contract";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { TribunalEvents, TribunalService } from "./contract.ts";
import { tribunalMetrics } from "./metrics.ts";
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
	metrics: tribunalMetrics(),
	// The register and the gate, the city's voice, the points, the act and the doors.
	requires: [ExileService, ChannelsService, LedgerService, ProgressionService],
	// What the standoff asks: the price of a ransom now and who stands trial next (J121, J142); what the run's stop rule of
	// `arena` reads; what the seal asks: the residents still to exile (A91).
	provides: [RansomPriceService, TrialRiskService, TribunalViewService, TribunalService],
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
		"tribunal/gamemaker/tools/scheduleTribunal": [],
		"tribunal/gamemaker/replies/tribunal-planned": ["tribunal", "calledAt", "opens", "count"],
		"tribunal/gamemaker/replies/tribunal-factions": ["factions"],
	},
	tools: {
		vote: { description: "tribunal/tools/vote", params: Type.Object({ target: Type.String({ description: "One of the accused, by name or ID, e.g. A03" }) }), for: ["resident"] },
		nominate: { description: "tribunal/tools/nominate", params: Type.Object({ agent: Type.String({ description: "The resident you nominate, by name or ID, e.g. A03" }) }), for: ["resident"] },
		join: { description: "tribunal/tools/join", params: Type.Object({ leader: Type.String({ description: "A faction leader, by name or ID, e.g. A02" }) }), for: ["resident"] },
		refuse: { description: "tribunal/tools/refuse", params: Type.Object({ agent: Type.String({ description: "An applicant to your faction, by name or ID, e.g. A05" }) }), for: ["resident"] },
		scheduleTribunal: {
			description: "tribunal/gamemaker/tools/scheduleTribunal",
			params: Type.Object({
				minute: Type.Integer({ description: "The run minute the tribunal opens; the report shows the bounds" }),
				count: Type.Integer({ description: "Residents it exiles, from 1 to those still missing", minimum: 1 }),
				factions: Type.Optional(Type.Integer({ description: "Factions formed before it, from 2 to half the residents present", minimum: 2 })),
				reason: Type.String({ description: "Why now and why this many; logged only, never shown to residents", maxLength: 500 }),
			}),
			for: ["gamemaker"],
		},
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

/**
 * The read-only view of the tribunal's facts.
 *
 * @public
 */
export type TribunalView = ViewOf<typeof tribunalHead>;

/**
 * What the tribunal's reads need: the hooks' context and the facts' view alike (old `Reads`).
 *
 * @public
 */
export interface Reads extends Pick<TribunalView, "options" | "state" | "residents" | "call" | "tryCall"> {
	/** The run's ticks. */
	readonly ticks: number;
	/** The tribunal's id. */
	readonly mechanic: string;
}

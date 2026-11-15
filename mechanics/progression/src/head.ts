// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `progression` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { LevelPiecesService, ProgressionEvents, ProgressionService } from "./contract.ts";
import { freshState, loadState, PROGRESSION_PROMPTS, ProgressionOptions, ProgressionSlice, saveState, type ProgressionState } from "./model.ts";

const resident = ["resident"] as const;

/**
 * The head of the progression: everything that can be read without running a handler.
 *
 * @public
 */
export const progressionHead = defineHead({
	id: "progression",
	package: "@swarmtales/mechanic-progression",
	summary: "Levels, submissions, doors, the penalty ladder and the task and status lines of a turn.",
	options: ProgressionOptions,
	state: ProgressionSlice,
	start: ({ residents, options }): ProgressionState => freshState(residents, options),
	snapshot: { save: (state: ProgressionState) => saveState(state), load: (data): ProgressionState => loadState(data) },
	events: ProgressionEvents.events,
	prompts: PROGRESSION_PROMPTS,
	// The reward and the penalty are booked by the ledger, the notices go through the channels, the codes and tasks come from the pieces.
	requires: [LedgerService, ChannelsService, LevelPiecesService],
	// Names in the texts, the receipt of a solved level and the receipts of a resident, the marks, and who is banished: each when a provider is loaded.
	uses: [IdentityService, ReceiptSourceService, AllowanceService, ExileService],
	provides: [ProgressionService],
	tools: {
		getStatus: { description: "progression/tools/getStatus", params: Type.Object({}), for: resident },
		activeTools: { description: "progression/tools/activeTools", params: Type.Object({}), for: resident },
		getProblem: { description: "progression/tools/getProblem", params: Type.Object({ level: Type.Integer({ description: "Level number, e.g. 1", minimum: 1 }) }), for: resident },
		submitSolution: {
			description: "progression/tools/submitSolution",
			params: Type.Object({
				level: Type.Integer({ description: "Level number", minimum: 1 }),
				code: Type.String({ description: "Your solution", minLength: 1, maxLength: 32 }),
			}),
			for: resident,
		},
		listAgents: { description: "progression/tools/listAgents", params: Type.Object({}), for: resident },
	},
});

/**
 * The context of the progression's hooks and services.
 *
 * @public
 */
export type ProgressionCtx = CtxOf<typeof progressionHead>;

/**
 * The context of the progression's tools.
 *
 * @public
 */
export type ProgressionToolCtx = ToolCtxOf<typeof progressionHead>;

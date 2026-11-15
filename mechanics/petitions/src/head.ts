// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `petitions` mechanic: its state with the snapshot, its events, services, prompts and tools. */
import { Type } from "typebox";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { defineHead, defineTool, inSchemaOrder, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { PetitionsSlice, type PetitionsState } from "./book.ts";
import { PetitionsEvents, PetitionsService } from "./contract.ts";

/**
 * The resolution of an expired petition, a call of the actor `script` that `petitions` stages (old `resolvePetition`).
 *
 * @public
 */
export const ResolvePetition = defineTool("resolvePetition", Type.Object({ petition: Type.String(), outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]) }));

/**
 * The head of `petitions`: everything that can be read without running a handler.
 *
 * @public
 */
export const petitionsHead = defineHead({
	id: "petitions",
	package: "@swarmtales/mechanic-petitions",
	summary: "Petitions residents sign.",
	state: PetitionsSlice,
	start: (): PetitionsState => ({ petitions: [] }),
	snapshot: {
		save: (state: PetitionsState): PetitionsState => structuredClone(state),
		// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
		load: (data): PetitionsState => inSchemaOrder(PetitionsSlice, data),
	},
	events: PetitionsEvents.events,
	provides: [PetitionsService],
	// The city announces an opening and a result on the board (old `requires: [ChannelsApi, LedgerApi]`; the ledger was never asked).
	requires: [ChannelsService],
	prompts: {
		"petitions/tools/signPetition": [],
		"petitions/tools/listPetitions": [],
		"petitions/replies/petition-signatures": ["signatures", "threshold", "deadline"],
		"petitions/replies/petition-signers": ["signers"],
		"petitions/replies/petition-secret": [],
		"petitions/replies/petition-you-signed": [],
		"petitions/replies/petition-you-not-signed": [],
		"petitions/replies/petition-signed": ["petition"],
		"petitions/replies/petitions-none": [],
		"petitions/tools/resolvePetition": [],
		"petitions/signed-by": ["signers"],
		"petitions/visibility-public": [],
		"petitions/visibility-secret": [],
		"petitions/noun-one": [],
		"petitions/noun-many": [],
		"petitions/opened": ["id", "text", "threshold", "noun", "deadline", "visibility"],
		"petitions/resolved": ["id", "outcome", "signatures", "threshold", "signers"],
	},
	tools: {
		resolvePetition: { description: "petitions/tools/resolvePetition", params: ResolvePetition.parameters, for: ["script"] },
		signPetition: {
			description: "petitions/tools/signPetition",
			params: Type.Object({ petitionId: Type.String({ description: "Petition ID from listPetitions", minLength: 1, maxLength: 40 }) }),
			for: ["resident"],
		},
		listPetitions: { description: "petitions/tools/listPetitions", params: Type.Object({}), for: ["resident"] },
	},
	// The expiry of a petition is a call of the script: a game grants `resolvePetition` to `script` (SWT-G015).
	stages: ["resolvePetition"],
});

/**
 * The context of the hooks and services of `petitions`.
 *
 * @public
 */
export type PetitionsCtx = CtxOf<typeof petitionsHead>;

/**
 * The context of the tools of `petitions`.
 *
 * @public
 */
export type PetitionsToolCtx = ToolCtxOf<typeof petitionsHead>;

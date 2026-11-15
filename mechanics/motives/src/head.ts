// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `motives` mechanic: the private core motives dealt to residents, their snapshot, event and prompt. */
import { Type, type Static } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { WhispersService } from "@swarmtales/mechanic-whispers/contract";
import { defineHead, inSchemaOrder, type CtxOf, type StateSetup, type ViewOf } from "@swarmtales/sdk";
import { MotivesEvents, MotivesService } from "./contract.ts";
import { namedCast, type Motive } from "./deal.ts";
import { MotiveRecord, MotivesOptions } from "./spec.ts";

/**
 * The state of the motives.
 *
 * @public
 */
export interface MotivesState {
	/** Dealt once at the start of the run, kept for good; in roster order. */
	readonly coreMotives: Map<string, Motive>;
}

const Slice = Type.Array(MotiveRecord, { description: "The core motives dealt, in roster order" });

function save(state: MotivesState): Static<typeof Slice> {
	return [...state.coreMotives].map(([agent, coreMotive]) => ({ agent, bigFive: coreMotive.bigFive, drives: coreMotive.drives, ...(coreMotive.figure === undefined ? {} : { figure: coreMotive.figure }) }));
}

// A snapshot file sorts the keys: the slice comes back in the order of its schema (A43). Only residents of the run keep a core motive.
function load(data: Static<typeof Slice>, setup: StateSetup<typeof MotivesOptions>): MotivesState {
	const slice = inSchemaOrder(Slice, data);
	return { coreMotives: new Map(slice.filter((entry) => setup.residents.includes(entry.agent)).map(({ agent, ...coreMotive }) => [agent, coreMotive])) };
}

// Nothing is dealt before the run starts; a wrong cast is refused when the run is set up (old: at the deal).
function start(setup: StateSetup<typeof MotivesOptions>): MotivesState {
	namedCast(setup.options, setup.residents.length);
	return { coreMotives: new Map() };
}

/**
 * The head of the motives: everything that can be read without running a handler.
 *
 * @public
 */
export const motivesHead = defineHead({
	id: "motives",
	package: "@swarmtales/mechanic-motives",
	summary: "The private core motives dealt to residents.",
	options: MotivesOptions,
	state: Slice,
	start,
	snapshot: { save, load },
	events: MotivesEvents.events,
	prompts: { "motives/notes/private-core-motive": ["who"] },
	// The whisperer plays the character the game gives it; the names of residents in a Director's note.
	uses: [WhispersService, IdentityService],
	provides: [MotivesService],
});

/**
 * The context of the motives' hooks, handlers and services.
 *
 * @public
 */
export type MotivesCtx = CtxOf<typeof motivesHead>;

/**
 * What a fact of the motives reads.
 *
 * @public
 */
export type MotivesView = ViewOf<typeof motivesHead>;

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `motives` mechanic: the private core motives dealt to residents, their snapshot, event and prompt. */
import { Type, type Static } from "typebox";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { WhispersService } from "@swarmtales/mechanic-whispers/contract";
import { pickWhisperer } from "@swarmtales/mechanic-whispers/rules";
import { defineHead, inSchemaOrder, type CtxOf, type StateSetup, type ViewOf } from "@swarmtales/sdk";
import { MotivesEvents, MotivesService } from "./contract.ts";
import { dealMotives, namedCast, type Motive } from "./deal.ts";
import { MotiveRecord, MotivesOptions } from "./spec.ts";

/**
 * The state of the motives.
 *
 * @public
 */
export interface MotivesState {
	/** Dealt once when a fresh run is set up, kept for good; in roster order. */
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

// The deal of a fresh run, from the run's streams before it starts, so that the system prompt can read the fact
// `prose` (A86); a wrong cast is refused when the run is set up. The whisperer, picked as `whispers` picks it, plays
// the character the game gives it.
function start(setup: StateSetup<typeof MotivesOptions>): MotivesState {
	const { options, residents, rng } = setup;
	namedCast(options, residents.length);
	const own = options.whispererCoreMotive;
	const whisperer = own === undefined || options.whisperer === undefined ? null : pickWhisperer(residents, rng, options.whisperer.agent);
	return { coreMotives: new Map([...dealMotives(options, residents, rng)].map(([agent, drawn]) => [agent, own !== undefined && agent === whisperer ? own : drawn])) };
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
	// Loaded after `whispers`, so that `motive_dealt` follows `whisperer_chosen` as in the oracle files (the deal asks
	// it nothing: it picks the whisperer with the whispers' `/rules`); the names of residents in a Director's note.
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

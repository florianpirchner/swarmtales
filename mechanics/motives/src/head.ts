/**
 * The head of the motives mechanic (carve step 9, team T2): the private core motives dealt to residents.
 * Declared apart so the helpers in the other files can type their context with it.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, MotivesApi, WhispersApi } from "@swarmtales/mechanic-shared";
import type { CoreMotive } from "./deal.ts";
import { CoreMotiveDrive, CoreMotiveTrait, CoreMotivesOptions } from "./spec.ts";

/** `core_dealt`, payload in the golden key order. */
const events = {
	core_dealt: Type.Object({ agent: Type.String(), bigFive: Type.Array(CoreMotiveTrait), drives: Type.Array(CoreMotiveDrive), figure: Type.Optional(Type.String()) }),
};

export interface CoreMotivesState {
	/** Dealt once, kept for good; in roster order. */
	readonly coreMotives: Map<string, CoreMotive>;
	/** The story's whisperer, once told (not kept: a resumed run reads it from the log). */
	whisperer?: string;
}

export const motivesHead = defineHead({
	id: "motives",
	summary: "The private core motives dealt to residents.",
	options: CoreMotivesOptions,
	state: (): CoreMotivesState => ({ coreMotives: new Map() }),
	events,
	provides: [MotivesApi],
	uses: [WhispersApi],
	requires: [ChannelsApi],
});

/**
 * The head of the cores mechanic (carve step 9, team T2): the private cores dealt to residents.
 * Declared apart so the helpers in the other files can type their context with it.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, CoresApi } from "@swarmtales/mechanic-shared";
import type { Core } from "./deal.ts";
import { CoreDrive, CoreTrait, CoresOptions } from "./spec.ts";

/** `core_dealt`, payload in the golden key order. */
const events = {
	core_dealt: Type.Object({ agent: Type.String(), bigFive: Type.Array(CoreTrait), drives: Type.Array(CoreDrive), figure: Type.Optional(Type.String()) }),
};

export interface CoresState {
	/** Dealt once, kept for good; in roster order. */
	readonly cores: Map<string, Core>;
	/** The story's whisperer, once told (not kept: a resumed run reads it from the log). */
	whisperer?: string;
}

export const coresHead = defineHead({
	id: "cores",
	summary: "The private cores dealt to residents.",
	options: CoresOptions,
	state: (): CoresState => ({ cores: new Map() }),
	events,
	provides: [CoresApi],
	requires: [ChannelsApi],
});

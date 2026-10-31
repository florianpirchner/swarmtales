/**
 * The `standoff` mechanic (carve step 11, team T4, docs/design/carve-team-T4.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, LedgerApi, ProgressionApi, PuzzlesApi, StandoffApi } from "@swarmtales/mechanic-shared";

export const standoffHead = defineHead({
	id: "standoff",
	summary: "Pieces residents hold for others, kept pieces and ultimatums.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [StandoffApi],
	requires: [PuzzlesApi, ProgressionApi, LedgerApi, ChannelsApi],
});

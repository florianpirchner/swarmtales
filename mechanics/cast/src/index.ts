/**
 * The `cast` mechanic (carve step 9, team T2, docs/design/carve-team-T2.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, CastEvents, ChannelsApi, LedgerApi, ProgressionApi } from "@swarmtales/mechanic-shared";

export const castHead = defineHead({
	id: "cast",
	summary: "The cast: figures, their escrow, collections and lotteries.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...CastEvents.events },
	provides: [CastApi],
	requires: [ChannelsApi, ProgressionApi, LedgerApi],
});

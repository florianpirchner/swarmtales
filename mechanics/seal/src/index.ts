/**
 * The `seal` mechanic (carve step 14, team T4, docs/design/carve-team-T4.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, ProgressionApi, SealApi, TribunalApi } from "@swarmtales/mechanic-shared";

export const sealHead = defineHead({
	id: "seal",
	summary: "The black seal auction.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [SealApi],
	requires: [LedgerApi, ProgressionApi, ChannelsApi, ExileApi, TribunalApi],
});

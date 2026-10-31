/**
 * The `goals` mechanic (carve step 9, team T3, docs/design/carve-team-T3.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, GoalsApi, ProgressionApi } from "@swarmtales/mechanic-shared";

export const goalsHead = defineHead({
	id: "goals",
	summary: "Secret goals per resident.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [GoalsApi],
	requires: [ProgressionApi, ChannelsApi],
});

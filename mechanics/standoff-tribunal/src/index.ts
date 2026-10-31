/**
 * The `standoff-tribunal` mechanic (carve step 15, team T4, docs/design/carve-team-T4.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, PuzzlesApi, StandoffApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";

export const standoffTribunalHead = defineHead({
	id: "standoff-tribunal",
	summary: "The holdout tribunal over a resident who keeps a fragment back.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [StandoffTribunalApi],
	requires: [StandoffApi, PuzzlesApi, ExileApi, ChannelsApi],
});

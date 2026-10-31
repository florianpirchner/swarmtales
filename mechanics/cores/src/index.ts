/**
 * The `cores` mechanic (carve step 9, team T2, docs/design/carve-team-T2.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi } from "@swarmtales/mechanic-shared";

export const coresHead = defineHead({
	id: "cores",
	summary: "The private cores dealt to residents.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	requires: [ChannelsApi],
});

/**
 * The `tribunal` mechanic (carve step 13, team T4, docs/design/carve-team-T4.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, ProgressionApi, TribunalApi } from "@swarmtales/mechanic-shared";

export const tribunalHead = defineHead({
	id: "tribunal",
	summary: "Tribunal sessions, votes and faction drafts.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [TribunalApi],
	requires: [ExileApi, ChannelsApi, LedgerApi, ProgressionApi],
});

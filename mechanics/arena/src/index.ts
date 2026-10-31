/**
 * The `arena` mechanic (carve step 18, team T3, docs/design/carve-team-T3.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { LedgerApi, ProgressionApi } from "@swarmtales/mechanic-shared";

export const arenaHead = defineHead({
	id: "arena",
	summary: "The old arena's run events and turn policy.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	uses: [ProgressionApi, LedgerApi],
});

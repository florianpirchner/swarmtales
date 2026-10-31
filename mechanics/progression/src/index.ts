/**
 * The `progression` mechanic (carve step 8, team T3, docs/design/carve-team-T3.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, LedgerApi, ProgressionApi, ProgressionEvents, PuzzlesApi, ReceiptsApi } from "@swarmtales/mechanic-shared";

export const progressionHead = defineHead({
	id: "progression",
	summary: "Levels, submissions, doors, acts and the ranking.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...ProgressionEvents.events },
	provides: [ProgressionApi],
	requires: [PuzzlesApi, LedgerApi, ChannelsApi, ReceiptsApi],
});

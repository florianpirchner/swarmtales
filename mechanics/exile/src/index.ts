/**
 * The `exile` mechanic (carve step 12, team T4, docs/design/carve-team-T4.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, ExileEvents, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi, StandoffApi } from "@swarmtales/mechanic-shared";

export const exileHead = defineHead({
	id: "exile",
	summary: "The gate, ransom, last will and exile.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...ExileEvents.events },
	provides: [ExileApi],
	requires: [ProgressionApi, ChannelsApi, LedgerApi, StandoffApi, PuzzlesApi],
	uses: [SealApi, GoalsApi],
});

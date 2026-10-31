/**
 * The `script` mechanic (carve step 16, team T3, docs/design/carve-team-T3.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, LedgerApi, PetitionsApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";

export const scriptHead = defineHead({
	id: "script",
	summary: "The director's rules as staged calls.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	uses: [ChannelsApi, ProgressionApi, CastApi, PetitionsApi, LedgerApi, PuzzlesApi],
});

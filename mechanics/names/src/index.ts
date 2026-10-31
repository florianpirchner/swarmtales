/**
 * The `names` mechanic (carve step 1, team T1, docs/design/carve-team-T1.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { NamesApi, PuzzlesApi } from "@swarmtales/mechanic-shared";

export const namesHead = defineHead({
	id: "names",
	summary: "Names residents chose, for texts and arguments.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [NamesApi],
	uses: [PuzzlesApi],
});

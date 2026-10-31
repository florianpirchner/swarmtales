/**
 * The `puzzles` mechanic (carve step 7, team T3, docs/design/carve-team-T3.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { PuzzlesApi } from "@swarmtales/mechanic-shared";

export const puzzlesHead = defineHead({
	id: "puzzles",
	summary: "The deal of each level: fragments, factors, teams and exclusions.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [PuzzlesApi],
});

/**
 * The `marks` mechanic (carve step 3, team T1, docs/design/carve-team-T1.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { LedgerApi, MarksApi } from "@swarmtales/mechanic-shared";

export const marksHead = defineHead({
	id: "marks",
	summary: "The marks a message costs and their refill.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [MarksApi],
	requires: [LedgerApi],
});

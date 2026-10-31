/**
 * The `ledger` mechanic (carve step 2, team T1, docs/design/carve-team-T1.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { LedgerApi, LedgerEvents } from "@swarmtales/mechanic-shared";

export const ledgerHead = defineHead({
	id: "ledger",
	summary: "Points per account and bookings between accounts.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...LedgerEvents.events },
	provides: [LedgerApi],
});

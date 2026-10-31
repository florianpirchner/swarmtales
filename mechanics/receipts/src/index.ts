/**
 * The `receipts` mechanic (carve step 5, team T1, docs/design/carve-team-T1.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, LedgerApi, ReceiptsApi } from "@swarmtales/mechanic-shared";

export const receiptsHead = defineHead({
	id: "receipts",
	summary: "City-verified receipts and blame.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	provides: [ReceiptsApi],
	requires: [ChannelsApi, LedgerApi],
});

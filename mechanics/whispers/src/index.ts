/**
 * The `whispers` mechanic (carve step 6, team T1, docs/design/carve-team-T1.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, MarksApi, ReceiptsApi } from "@swarmtales/mechanic-shared";

export const whispersHead = defineHead({
	id: "whispers",
	summary: "The whisperer, forged receipts and the popularity vote.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	requires: [ReceiptsApi, ChannelsApi, LedgerApi, MarksApi],
	uses: [ExileApi],
});

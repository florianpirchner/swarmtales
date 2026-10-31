/**
 * The `channels` mechanic (carve step 4, team T2, docs/design/carve-team-T2.md).
 * Empty in wave 3.0: only its head, with the frozen APIs and events of
 * `@swarmtales/mechanic-shared` it provides, requires and uses. The team adds state, options,
 * events, prompts and the body (`defineMechanic(head, build)`) here.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, ChannelsEvents, LedgerApi, MarksApi, NamesApi, ReceiptsApi, StandoffApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";

export const channelsHead = defineHead({
	id: "channels",
	summary: "The board, direct messages, notices and groups.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...ChannelsEvents.events },
	provides: [ChannelsApi],
	requires: [LedgerApi, MarksApi, NamesApi],
	uses: [ReceiptsApi, CastApi, StandoffApi, StandoffTribunalApi],
});

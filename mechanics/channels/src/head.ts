// SPDX-License-Identifier: Apache-2.0
/** The head of `channels`: its state with the snapshot, its events, its services, its prompts and its tools. */
import { Type } from "typebox";
import { ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { ChannelsService } from "./contract.ts";
import { ChannelsEvents } from "./events.ts";
import { GROUP_PROMPTS, GROUP_TOOLS } from "./group-specs.ts";
import { MAX_DM_LENGTH } from "./mailbox.ts";
import { ChannelsSlice, loadState, newState, saveState, withoutGroups, type ChannelsState } from "./state.ts";

/**
 * The head of `channels`: everything that can be read without running a handler.
 *
 * @public
 */
export const channelsHead = defineHead({
	id: "channels",
	package: "@swarmtales/mechanic-channels",
	summary: "Talk in the city: the public board, direct messages, private notices and groups with a treasury.",
	state: ChannelsSlice,
	start: ({ residents }): ChannelsState => newState(residents),
	snapshot: { save: (state: ChannelsState) => saveState(state), load: (data, setup): ChannelsState => loadState(data, setup.residents) },
	version: 2,
	migrations: { 1: withoutGroups },
	events: ChannelsEvents.events,
	provides: [ChannelsService],
	uses: [LedgerService, ReceiptSourceService],
	prompts: {
		"channels/tools/readBoard": [],
		"channels/tools/postBoard": [],
		"channels/tools/sendDM": [],
		"channels/replies/board-hidden": ["count"],
		"channels/replies/board-none": [],
		"channels/replies/board-posted": ["seq"],
		"channels/replies/dm-sent": ["number", "target"],
		"channels/input/dm": ["number", "from", "text"],
		"channels/input/notice": ["author", "text"],
		"channels/notices/dm-delivered": ["number", "agent", "minute", "text"],
		...GROUP_PROMPTS,
	},
	tools: {
		readBoard: {
			description: "channels/tools/readBoard",
			params: Type.Object({
				afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
				limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
			}),
			for: ["resident"],
		},
		postBoard: {
			description: "channels/tools/postBoard",
			params: Type.Object({ message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }) }),
			for: ["resident"],
		},
		sendDM: {
			description: "channels/tools/sendDM",
			params: Type.Object({
				target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
				message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			for: ["resident"],
		},
		...GROUP_TOOLS,
	},
});

/** The context of the hooks and the service of `channels`. */
export type Ctx = CtxOf<typeof channelsHead>;

/** The context of the tools of `channels`. */
export type ToolCtx = ToolCtxOf<typeof channelsHead>;

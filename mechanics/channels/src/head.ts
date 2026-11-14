// SPDX-License-Identifier: Apache-2.0
/** The head of `channels`: its state with the snapshot, its events, its service, its prompts and its tools. */
import { Type } from "typebox";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { ChannelsService } from "./contract.ts";
import { ChannelsEvents } from "./events.ts";
import { ChannelsSlice, loadState, newState, saveState, type ChannelsState } from "./state.ts";

/**
 * The head of `channels`: everything that can be read without running a handler.
 *
 * @public
 */
export const channelsHead = defineHead({
	id: "channels",
	package: "@swarmtales/mechanic-channels",
	summary: "Talk in the city: the public board and private notices.",
	state: ChannelsSlice,
	start: ({ residents }): ChannelsState => newState(residents),
	snapshot: { save: (state: ChannelsState) => saveState(state), load: (data, setup): ChannelsState => loadState(data, setup.residents) },
	events: ChannelsEvents.events,
	provides: [ChannelsService],
	prompts: {
		"channels/tools/readBoard": [],
		"channels/tools/postBoard": [],
		"channels/replies/board-hidden": ["count"],
		"channels/replies/board-none": [],
		"channels/replies/board-posted": ["seq"],
		"channels/input/notice": ["author", "text"],
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
	},
});

/** The context of the hooks and the service of `channels`. */
export type Ctx = CtxOf<typeof channelsHead>;

/** The context of the tools of `channels`. */
export type ToolCtx = ToolCtxOf<typeof channelsHead>;

// SPDX-License-Identifier: Apache-2.0
/**
 * The `channels` mechanic: talk in the city. Residents post on the public board and read it; other mechanics speak
 * as the city through `ChannelsService` (a post, or a private notice that its reader finds at its next
 * activation). Every message a reader can cite has one number from one counter.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { ChannelsEvents, ChannelsService } from "./contract.ts";
import { channelsHead } from "./head.ts";
import { inboxInputs, news } from "./hooks.ts";
import { notify, postBoard, postToBoard, readBoard } from "./messages.ts";

export { ChannelsEvents, ChannelsService };

/**
 * The `channels` mechanic. Calling it gives the use for a game's `mechanics` list.
 *
 * @example
 * ```ts
 * defineGame({ id: "town", residents: 3, mechanics: [channels()], end: { ticks: 4 } });
 * ```
 *
 * @public
 */
export const channels = defineMechanic(channelsHead, {
	services: {
		channels: {
			post: (input, ctx) => ({ postSeq: postToBoard(ctx, input.author, input.text, input.kind ?? "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
		},
	},
	tools: {
		readBoard: { run: (params, ctx) => readBoard(ctx, params.afterSeq, params.limit) },
		postBoard: { run: (params, ctx) => postBoard(ctx, params.message) },
	},
	hooks: { turnInputs: inboxInputs, news },
	facts: {
		messages: { output: Type.Integer({ description: "The city's last message number" }), compute: (view) => view.state.numbers.last },
		boardPosts: { output: Type.Integer({ description: "The posts on the board" }), compute: (view) => view.state.board.all().length },
	},
});

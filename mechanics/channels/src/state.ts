// SPDX-License-Identifier: Apache-2.0
/** The state of `channels` and its snapshot slice: the board, the message counter, each resident's inbox and its "seen" mark. */
import { Type, type Static } from "typebox";
import { Board } from "./board.ts";
import { ChannelsEvents } from "./events.ts";
import { MessageNumbers } from "./numbers.ts";

/** A private notice that waits for its reader. */
export interface Notice {
	/** The name it is signed with. */
	readonly author: string;
	/** The text. */
	readonly text: string;
}

/** What waits for one resident until its next activation. */
export interface Inbox {
	/** The notices, oldest first. */
	readonly notices: Notice[];
}

/** The state of one run. */
export interface ChannelsState {
	/** The city's message counter. */
	readonly numbers: MessageNumbers;
	/** The public board. */
	readonly board: Board;
	/** The inbox of every resident. */
	readonly inboxes: Map<string, Inbox>;
	/** The newest player post each resident has seen (the news of the board). */
	readonly seenBoard: Map<string, number>;
}

/**
 * Builds the state of a fresh run.
 *
 * @param residents - Every resident of the run.
 * @returns The state: an empty board and an empty inbox per resident.
 */
export function newState(residents: readonly string[]): ChannelsState {
	const numbers = new MessageNumbers();
	return { numbers, board: new Board(numbers), inboxes: new Map(residents.map((id) => [id, { notices: [] }])), seenBoard: new Map() };
}

const Id = Type.String({ description: "A resident id" });
const Seq = Type.Integer({ description: "A message number of the city" });
const Text = Type.String({ description: "The text" });
const Post = Type.Object(
	{ seq: Seq, author: Type.String({ description: "Who wrote the post" }), text: Text, tick: Type.Integer({ description: "The tick it was posted in" }), kind: ChannelsEvents.events.board_post.properties.kind },
	{ description: "One post on the board" },
);
const Cursor = Type.Object({ reader: Type.String({ description: "The reader" }), seq: Seq }, { description: "How far one reader has read" });
const NoticeSlice = Type.Object({ author: Type.String({ description: "The name it is signed with" }), text: Text }, { description: "A notice that waits" });
const InboxSlice = Type.Object({ resident: Id, notices: Type.Array(NoticeSlice, { description: "The notices, oldest first" }) }, { description: "The inbox of one resident" });

/** The snapshot slice of `channels`. */
export const ChannelsSlice = Type.Object(
	{
		board: Type.Object({ posts: Type.Array(Post, { description: "Every post, oldest first" }), cursors: Type.Array(Cursor, { description: "The read cursors" }) }, { description: "The public board" }),
		messages: Type.Integer({ description: "The city's last message number" }),
		inboxes: Type.Array(InboxSlice, { description: "What waits for each resident" }),
		seen: Type.Array(Type.Object({ resident: Id, seq: Seq }, { description: "A seen mark" }), { description: "The newest player post each resident has seen" }),
	},
	{ description: "The board, the message counter, the inboxes and the seen marks" },
);

/**
 * Saves the state into its slice.
 *
 * @param state - The state.
 * @returns The data of the slice.
 */
export function saveState(state: ChannelsState): Static<typeof ChannelsSlice> {
	return {
		board: state.board.snapshot(),
		messages: state.numbers.last,
		inboxes: [...state.inboxes].map(([resident, inbox]) => ({ resident, notices: [...inbox.notices] })),
		seen: [...state.seenBoard].map(([resident, seq]) => ({ resident, seq })),
	};
}

/**
 * Loads the state from its slice; what the slice says about an id that is no resident of the run is dropped.
 *
 * @param data - The data of the slice.
 * @param residents - Every resident of the run.
 * @returns The state.
 */
export function loadState(data: Static<typeof ChannelsSlice>, residents: readonly string[]): ChannelsState {
	const state = newState(residents);
	state.numbers.raiseTo(data.messages);
	state.board.restore(data.board);
	for (const entry of data.inboxes) if (state.inboxes.has(entry.resident)) state.inboxes.set(entry.resident, { notices: [...entry.notices] });
	for (const entry of data.seen) if (state.inboxes.has(entry.resident)) state.seenBoard.set(entry.resident, entry.seq);
	return state;
}

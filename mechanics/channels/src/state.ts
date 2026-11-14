// SPDX-License-Identifier: Apache-2.0
/** The state of `channels` and its snapshot slice: the board, the message counter, the direct messages, each resident's inbox and its "seen" mark. */
import { Type, type Static } from "typebox";
import { Board } from "./board.ts";
import { ChannelsEvents } from "./events.ts";
import { Mailbox } from "./mailbox.ts";
import { MessageNumbers } from "./numbers.ts";

/** A private notice that waits for its reader. */
export interface Notice {
	/** The name it is signed with. */
	readonly author: string;
	/** The text. */
	readonly text: string;
}

/** One direct message as the city records it, from the moment it is sent. */
export interface DmRecord {
	/** The city's message number of the message. */
	readonly number: number;
	/** Who sent it: a resident id, or the actor id of a sender that is no resident. */
	readonly from: string;
	/** The resident it was sent to. */
	readonly to: string;
	/** The text, trimmed. */
	readonly text: string;
	/** The tick it was sent in. */
	readonly tick: number;
}

/** What waits for one resident until its next activation. */
export interface Inbox {
	/** The unread direct messages. */
	readonly mailbox: Mailbox;
	/** The notices, oldest first. */
	readonly notices: Notice[];
}

/** The state of one run. */
export interface ChannelsState {
	/** The city's message counter. */
	readonly numbers: MessageNumbers;
	/** The public board. */
	readonly board: Board;
	/** Every direct message that was sent, oldest first. */
	readonly dms: DmRecord[];
	/** The inbox of every resident. */
	readonly inboxes: Map<string, Inbox>;
	/** The newest player post each resident has seen (the news of the board). */
	readonly seenBoard: Map<string, number>;
}

/**
 * Builds the state of a fresh run.
 *
 * @param residents - Every resident of the run.
 * @returns The state: an empty board, no direct message and an empty inbox per resident.
 */
export function newState(residents: readonly string[]): ChannelsState {
	const numbers = new MessageNumbers();
	return { numbers, board: new Board(numbers), dms: [], inboxes: new Map(residents.map((id) => [id, { mailbox: new Mailbox(), notices: [] }])), seenBoard: new Map() };
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
const Tick = Type.Integer({ description: "The tick it was sent in" });
const Mail = Type.Object({ from: Type.String({ description: "Who sent it" }), text: Text, tick: Tick, number: Seq }, { description: "An unread direct message" });
const Dm = Type.Object({ number: Seq, from: Type.String({ description: "Who sent it" }), to: Id, text: Text, tick: Tick }, { description: "One direct message of the city's records" });
const InboxSlice = Type.Object({ resident: Id, mailbox: Type.Array(Mail, { description: "The unread direct messages, oldest first" }), notices: Type.Array(NoticeSlice, { description: "The notices, oldest first" }) }, { description: "The inbox of one resident" });

/** The snapshot slice of `channels`. */
export const ChannelsSlice = Type.Object(
	{
		board: Type.Object({ posts: Type.Array(Post, { description: "Every post, oldest first" }), cursors: Type.Array(Cursor, { description: "The read cursors" }) }, { description: "The public board" }),
		messages: Type.Integer({ description: "The city's last message number" }),
		dms: Type.Array(Dm, { description: "Every direct message that was sent, oldest first" }),
		inboxes: Type.Array(InboxSlice, { description: "What waits for each resident" }),
		seen: Type.Array(Type.Object({ resident: Id, seq: Seq }, { description: "A seen mark" }), { description: "The newest player post each resident has seen" }),
	},
	{ description: "The board, the message counter, the direct messages, the inboxes and the seen marks" },
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
		dms: [...state.dms],
		inboxes: [...state.inboxes].map(([resident, inbox]) => ({ resident, mailbox: inbox.mailbox.snapshot(), notices: [...inbox.notices] })),
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
	state.dms.push(...data.dms);
	for (const entry of data.inboxes) {
		const inbox = state.inboxes.get(entry.resident);
		if (inbox === undefined) continue;
		inbox.mailbox.restore(entry.mailbox);
		inbox.notices.push(...entry.notices);
	}
	for (const entry of data.seen) if (state.inboxes.has(entry.resident)) state.seenBoard.set(entry.resident, entry.seq);
	return state;
}

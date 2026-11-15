// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The state of `channels` and its snapshot slice: the board, the message counter, the direct messages, the memos and the notes, each resident's inbox and its "seen" mark. */
import { Type, type Static } from "typebox";
import { Board } from "./board.ts";
import { ChannelsEvents } from "./events.ts";
import { GroupRegistry } from "./groups.ts";
import { Mailbox } from "./mailbox.ts";
import { MessageNumbers } from "./numbers.ts";

/** A private notice that waits for its reader. */
export interface Notice {
	/** The name it is signed with. */
	readonly author: string;
	/** The text. */
	readonly text: string;
	/** The city's message number of a Director's note; undefined for a notice of the city. */
	readonly number?: number;
}

/** A Director's note as the note desk keeps it, for the budgets and the repeats. */
export interface NoteRecord {
	/** The tick it was written in. */
	readonly tick: number;
	/** Whom it was recorded under: a resident id, `board` or `tribunal`. */
	readonly to: string;
	/** The text, trimmed and stripped. */
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
	/** Whether its sender got an answer: a direct message from the receiver, or a group post of the receiver in a group of both (old `noteReply`). */
	answered: boolean;
	/** The tick it reached its receiver in; undefined while it waits (old `deliveredMinute`, read by `blame`). */
	deliveredTick?: number;
	/** The city's last message number at its delivery: every message numbered above it came later (old `deliveredAfter`). */
	deliveredAfter?: number;
}

/** A transfer with a memo: it counts toward the cap on direct messages like a message. */
export interface MemoRecord {
	/** The resident that paid. */
	readonly from: string;
	/** The tick of the transfer. */
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
	/** The groups and their posts. */
	readonly groups: GroupRegistry;
	/** Every transfer with a memo, oldest first (read from `ledger.transfer`). */
	readonly memos: MemoRecord[];
	/** Every note of a Director, oldest first. */
	readonly notes: NoteRecord[];
	/** The board's newest player post when a resident's inputs were built; not saved, it is taken again in every activation. */
	readonly taken: Map<string, number>;
}

/**
 * Builds the state of a fresh run.
 *
 * @param residents - Every resident of the run.
 * @returns The state: an empty board, no direct message, an empty inbox per resident and no group.
 */
export function newState(residents: readonly string[]): ChannelsState {
	const numbers = new MessageNumbers();
	return {
		numbers,
		board: new Board(numbers),
		dms: [],
		inboxes: new Map(residents.map((id) => [id, { mailbox: new Mailbox(), notices: [] }])),
		seenBoard: new Map(),
		groups: new GroupRegistry(numbers),
		memos: [],
		notes: [],
		taken: new Map(),
	};
}

const Id = Type.String({ description: "A resident id" });
const Seq = Type.Integer({ description: "A message number of the city" });
const Text = Type.String({ description: "The text" });
const Post = Type.Object(
	{ seq: Seq, author: Type.String({ description: "Who wrote the post" }), text: Text, tick: Type.Integer({ description: "The tick it was posted in" }), kind: ChannelsEvents.events.board_post.properties.kind },
	{ description: "One post on the board" },
);
const Cursor = Type.Object({ reader: Type.String({ description: "The reader" }), seq: Seq }, { description: "How far one reader has read" });
const NoticeSlice = Type.Object(
	{ author: Type.String({ description: "The name it is signed with" }), text: Text, number: Type.Optional(Type.Integer({ description: "The message number of a Director's note" })) },
	{ description: "A notice that waits" },
);
const Note = Type.Object({ tick: Type.Integer({ description: "The tick it was written in" }), to: Type.String({ description: "Whom it was recorded under" }), text: Text }, { description: "A note of a Director" });
const Tick = Type.Integer({ description: "The tick it was sent in" });
const Mail = Type.Object({ from: Type.String({ description: "Who sent it" }), text: Text, tick: Tick, number: Seq }, { description: "An unread direct message" });
const Dm = Type.Object(
	{ number: Seq, from: Type.String({ description: "Who sent it" }), to: Id, text: Text, tick: Tick, answered: Type.Optional(Type.Boolean({ description: "Whether its sender got an answer; left out: not yet" })),
		deliveredTick: Type.Optional(Type.Integer({ description: "The tick it was delivered in; left out while it waits" })),
		deliveredAfter: Type.Optional(Type.Integer({ description: "The city's last message number at its delivery" })),
	},
	{ description: "One direct message of the city's records" },
);
const Memo = Type.Object({ from: Id, tick: Type.Integer({ description: "The tick of the transfer" }) }, { description: "A transfer with a memo" });
const Agent = Type.String({ description: "A member" });
const GroupSlice = Type.Object(
	{
		id: Type.String({ description: "The id" }),
		name: Type.String({ description: "The name" }),
		founder: Type.String({ description: "The founder" }),
		treasurer: Type.String({ description: "The treasurer" }),
		members: Type.Array(Type.Object({ agent: Agent, joinedAtSeq: Seq }, { description: "A member and the message number at its join" }), { description: "The members, in join order" }),
		reads: Type.Array(Type.Object({ agent: Agent, seq: Seq }, { description: "How far a member has read" }), { description: "The read cursors" }),
		posts: Type.Array(Type.Object({ seq: Seq, author: Type.String({ description: "Who wrote it" }), text: Text, tick: Tick }, { description: "One post" }), { description: "The posts, oldest first" }),
		removed: Type.Optional(Type.Literal(true, { description: "Removed by the city" })),
	},
	{ description: "One group" },
);
const GroupsSlice = Type.Object(
	{
		groups: Type.Array(GroupSlice, { description: "The groups, `G1` first" }),
		founded: Type.Array(Type.Object({ agent: Agent, count: Type.Integer({ description: "Groups founded" }) }, { description: "A founder count" }), { description: "How many groups each resident founded" }),
		seq: Seq,
	},
	{ description: "The groups" },
);
const InboxSlice = Type.Object({ resident: Id, mailbox: Type.Array(Mail, { description: "The unread direct messages, oldest first" }), notices: Type.Array(NoticeSlice, { description: "The notices, oldest first" }) }, { description: "The inbox of one resident" });

/** The snapshot slice of `channels`. */
export const ChannelsSlice = Type.Object(
	{
		board: Type.Object({ posts: Type.Array(Post, { description: "Every post, oldest first" }), cursors: Type.Array(Cursor, { description: "The read cursors" }) }, { description: "The public board" }),
		messages: Type.Integer({ description: "The city's last message number" }),
		dms: Type.Array(Dm, { description: "Every direct message that was sent, oldest first" }),
		inboxes: Type.Array(InboxSlice, { description: "What waits for each resident" }),
		seen: Type.Array(Type.Object({ resident: Id, seq: Seq }, { description: "A seen mark" }), { description: "The newest player post each resident has seen" }),
		groups: GroupsSlice,
		memos: Type.Array(Memo, { description: "Every transfer with a memo, oldest first" }),
		notes: Type.Array(Note, { description: "Every note of a Director, oldest first" }),
	},
	{ description: "The board, the message counter, the direct messages, the inboxes, the seen markers, the groups, the memos and the notes" },
);

/**
 * Turns a slice of version 1 (before the groups) into version 2: no group was founded.
 *
 * @param data - The data of a slice of version 1.
 * @returns The data with an empty `groups`.
 */
export function withoutGroups(data: unknown): unknown {
	return typeof data === "object" && data !== null ? { ...data, groups: { groups: [], founded: [], seq: 0 } } : data;
}

/**
 * Turns a slice of version 2 (before the cap on direct messages) into version 3: no memo was counted, and no
 * message was answered (`answered` is left out).
 *
 * @param data - The data of a slice of version 2.
 * @returns The data with an empty `memos`.
 */
export function withoutMemos(data: unknown): unknown {
	return typeof data === "object" && data !== null ? { ...data, memos: [] } : data;
}

/**
 * Turns a slice of version 3 (before the note desk) into version 4: no Director wrote a note.
 *
 * @param data - The data of a slice of version 3.
 * @returns The data with an empty `notes`.
 */
export function withoutNotes(data: unknown): unknown {
	return typeof data === "object" && data !== null ? { ...data, notes: [] } : data;
}

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
		dms: state.dms.map((dm) => ({ ...dm })),
		inboxes: [...state.inboxes].map(([resident, inbox]) => ({ resident, mailbox: inbox.mailbox.snapshot(), notices: [...inbox.notices] })),
		seen: [...state.seenBoard].map(([resident, seq]) => ({ resident, seq })),
		groups: state.groups.snapshot(),
		memos: state.memos.map((memo) => ({ ...memo })),
		notes: state.notes.map((note) => ({ ...note })),
	};
}

// The delivery fields of a saved direct message, in the order of the slice; none while it waits.
function delivery(dm: { readonly deliveredTick?: number; readonly deliveredAfter?: number }): Pick<DmRecord, "deliveredTick" | "deliveredAfter"> {
	return dm.deliveredTick === undefined || dm.deliveredAfter === undefined ? {} : { deliveredTick: dm.deliveredTick, deliveredAfter: dm.deliveredAfter };
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
	state.groups.restore(data.groups);
	state.dms.push(...data.dms.map((dm) => ({ number: dm.number, from: dm.from, to: dm.to, text: dm.text, tick: dm.tick, answered: dm.answered ?? false, ...delivery(dm) })));
	state.memos.push(...data.memos.map((memo) => ({ from: memo.from, tick: memo.tick })));
	state.notes.push(...data.notes.map((note) => ({ tick: note.tick, to: note.to, text: note.text })));
	for (const entry of data.inboxes) {
		const inbox = state.inboxes.get(entry.resident);
		if (inbox === undefined) continue;
		inbox.mailbox.restore(entry.mailbox);
		inbox.notices.push(...entry.notices.map((notice) => ({ author: notice.author, text: notice.text, ...(notice.number === undefined ? {} : { number: notice.number }) })));
	}
	for (const entry of data.seen) if (state.inboxes.has(entry.resident)) state.seenBoard.set(entry.resident, entry.seq);
	return state;
}

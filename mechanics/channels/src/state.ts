/**
 * The state of the channels mechanic and its snapshot slice. Version 1 starts from the version-0
 * slice the legacy converter cuts out of an old world snapshot: `board`, `groups`, `dms`,
 * `messages` and the per-resident `inboxes` (mailbox and notices, cut from the competitor records).
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { Board } from "./board.ts";
import { GroupRegistry } from "./groups.ts";
import { Mailbox } from "./mailbox.ts";
import { MessageNumbers } from "./numbers.ts";

export interface Notice {
	readonly author: string;
	readonly text: string;
	/** Set for numbered notes (the gamemaker's). */
	readonly number?: number;
}

/** One DM as the city records it, with the delivery blame needs (the shared `DmRecord` leaves these two out). */
export interface DmRecordState {
	readonly id: number;
	readonly from: string;
	readonly to: string;
	readonly minute: number;
	answered: boolean;
	readonly text: string;
	/** Minute the DM reached the recipient's turn input. */
	deliveredMinute?: number;
	/** The city's last message number at delivery: every message numbered above it came later. */
	deliveredAfter?: number;
}

export interface Inbox {
	readonly mailbox: Mailbox;
	readonly notices: Notice[];
}

export interface ChannelsState {
	readonly numbers: MessageNumbers;
	readonly board: Board;
	readonly groups: GroupRegistry;
	readonly dms: DmRecordState[];
	readonly inboxes: Map<string, Inbox>;
	/** Residents beyond the wall (told by the `exiled` event). */
	readonly exiled: Set<string>;
	/** The newest player post each resident has seen (novelty of the board). */
	readonly seenBoard: Map<string, number>;
	/** The board's newest player post when the block's inputs were built, and when the resident's turn opened. */
	readonly blockStart: Map<string, number>;
	readonly turnStart: Map<string, number>;
}

export function newState(residents: readonly string[]): ChannelsState {
	const numbers = new MessageNumbers();
	return {
		numbers,
		board: new Board(numbers),
		groups: new GroupRegistry(numbers),
		dms: [],
		inboxes: new Map(residents.map((id) => [id, { mailbox: new Mailbox(id), notices: [] }])),
		exiled: new Set(),
		seenBoard: new Map(),
		blockStart: new Map(),
		turnStart: new Map(),
	};
}

const Id = Type.String();
const Post = Type.Object({
	seq: Type.Integer(),
	author: Id,
	text: Type.String(),
	minute: Type.Integer(),
	kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
});
const BoardSlice = Type.Object({ posts: Type.Array(Post), cursors: Type.Array(Type.Object({ reader: Id, seq: Type.Integer() })) });
const GroupPost = Type.Object({ seq: Type.Integer(), author: Id, text: Type.String(), minute: Type.Integer() });
const GroupSlice = Type.Object({
	id: Id,
	name: Type.String(),
	founder: Id,
	treasurer: Id,
	members: Type.Array(Type.Object({ agent: Id, joinedAtSeq: Type.Integer() })),
	reads: Type.Array(Type.Object({ agent: Id, seq: Type.Integer() })),
	posts: Type.Array(GroupPost),
	removed: Type.Optional(Type.Literal(true)),
});
const GroupsSlice = Type.Object({
	groups: Type.Array(GroupSlice),
	founded: Type.Array(Type.Object({ agent: Id, count: Type.Integer() })),
	seq: Type.Integer(),
});
const Entry = Type.Object({ from: Id, text: Type.String(), minute: Type.Integer(), number: Type.Optional(Type.Integer()) });
const NoticeSlice = Type.Object({ author: Id, text: Type.String(), number: Type.Optional(Type.Integer()) });
const InboxSlice = Type.Object({ agent: Id, mailbox: Type.Array(Entry), notices: Type.Array(NoticeSlice) });
const DmSlice = Type.Object({
	id: Type.Integer(),
	from: Id,
	to: Id,
	minute: Type.Integer(),
	answered: Type.Boolean(),
	text: Type.Optional(Type.String()),
	deliveredMinute: Type.Optional(Type.Integer()),
	deliveredAfter: Type.Optional(Type.Integer()),
});

/** The version-0 slice: the old world fields as the converter cuts them. */
const V0 = Type.Object({
	board: BoardSlice,
	groups: GroupsSlice,
	dms: Type.Array(DmSlice),
	messages: Type.Optional(Type.Integer()),
	inboxes: Type.Array(InboxSlice),
});

export const ChannelsSlice = Type.Object({
	board: BoardSlice,
	groups: GroupsSlice,
	dms: Type.Array(DmSlice),
	/** The city's last message number. */
	messages: Type.Integer(),
	inboxes: Type.Array(InboxSlice),
	exiled: Type.Array(Id),
	seen: Type.Array(Type.Object({ agent: Id, seq: Type.Integer() })),
});
export type ChannelsSlice = Static<typeof ChannelsSlice>;

/** Version 0 to 1: the message counter is never below a number already in use; nobody is beyond the wall yet, nothing is seen. */
export function migrateFromV0(old: unknown): ChannelsSlice {
	const slice = Parse(V0, old);
	const used = Math.max(0, slice.board.posts.at(-1)?.seq ?? 0, slice.groups.seq, ...slice.dms.map((record) => record.id), slice.messages ?? 0);
	return { board: slice.board, groups: slice.groups, dms: slice.dms, messages: used, inboxes: slice.inboxes, exiled: [], seen: [] };
}

export function saveState(state: ChannelsState): ChannelsSlice {
	return {
		board: state.board.snapshot(),
		groups: state.groups.snapshot(),
		dms: state.dms.map((record) => ({ ...record })),
		messages: state.numbers.last,
		inboxes: [...state.inboxes].map(([agent, inbox]) => ({ agent, mailbox: [...inbox.mailbox.snapshot()], notices: [...inbox.notices] })),
		exiled: [...state.exiled],
		seen: [...state.seenBoard].map(([agent, seq]) => ({ agent, seq })),
	};
}

export function loadState(data: ChannelsSlice, residents: readonly string[]): ChannelsState {
	const state = newState(residents);
	const known = (agent: string): boolean => residents.includes(agent);
	state.numbers.raiseTo(data.messages);
	state.board.restore(data.board);
	state.groups.restore(data.groups);
	state.dms.push(...data.dms.map((record) => ({ ...record, text: record.text ?? "" })));
	state.numbers.raiseTo(Math.max(0, ...state.dms.map((record) => record.id)));
	for (const entry of data.inboxes) {
		if (!known(entry.agent)) continue;
		const mailbox = new Mailbox(entry.agent);
		mailbox.restore(entry.mailbox);
		state.inboxes.set(entry.agent, { mailbox, notices: [...entry.notices] });
	}
	for (const agent of data.exiled) state.exiled.add(agent);
	for (const entry of data.seen) if (known(entry.agent)) state.seenBoard.set(entry.agent, entry.seq);
	return state;
}

/**
 * The head of the channels mechanic (carve step 4, team T2): the board, direct messages, notices
 * and groups. Declared apart so the helpers in the other files can type their context with it.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, ChannelsEvents, LedgerApi, MarksApi, NamesApi, ReceiptsApi, StandoffApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { newState } from "./state.ts";

const Id = Type.String();

/** The events channels writes besides the shared `board_post` and `dm_sent`, payloads in the golden key order. */
const events = {
	...ChannelsEvents.events,
	dm_delivered: Type.Object({ number: Type.Integer(), from: Id, to: Id }),
	notice: Type.Object({ to: Id, author: Type.String(), text: Type.String(), number: Type.Optional(Type.Integer()) }),
	group_created: Type.Object({ group: Type.String(), founder: Id, name: Type.String() }),
	group_removed: Type.Object({ group: Type.String(), members: Type.Array(Id) }),
	group_membership: Type.Object({ group: Type.String(), agent: Id, change: Type.Union([Type.Literal("added"), Type.Literal("removed"), Type.Literal("left")]), by: Id }),
	group_post: Type.Object({ group: Type.String(), author: Id, postSeq: Type.Integer(), text: Type.String() }),
	treasury_deposit: Type.Object({ group: Type.String(), agent: Id, amount: Type.Number(), receipt: Type.String() }),
	treasury_withdrawal: Type.Object({ group: Type.String(), treasurer: Id, to: Id, amount: Type.Number(), receipt: Type.String() }),
	treasurer_set: Type.Object({ group: Type.String(), treasurer: Id, by: Id }),
	treasury_settled: Type.Object({ group: Type.String(), payouts: Type.Record(Type.String(), Type.Number()) }),
};

const options = Type.Object({
	dmLimit: Type.Optional(
		Type.Object(
			{
				windowMinutes: Type.Integer({ minimum: 1, description: "Length of one DM allowance window in minutes; windows are counted from minute 0." }),
				perWindow: Type.Integer({ minimum: 0, description: "DMs and memo transfers one resident may send in one window." }),
			},
			{ description: "The DM cap (the story's `rules.dmLimit`); without it residents may send as many DMs as marks and mailboxes allow." },
		),
	),
	quoteDms: Type.Boolean({ default: false, description: "Whether the receipt of a delivered DM quotes its text (the story's `rules.receipts.quoteDms`), so showing it proves what was written." }),
	noteAuthor: Type.String({ default: "COURIER", description: "The name the gamemaker's notes and board posts are signed with." }),
	noteMaxLength: Type.Integer({ minimum: 1, default: 400, description: "The longest text of a gamemaker note or board post in characters." }),
});

const prompts = {
	"tools/readBoard": [],
	"tools/postBoard": [],
	"tools/sendDM": [],
	"tools/createGroup": [],
	"tools/addGroupMember": [],
	"tools/removeGroupMember": [],
	"tools/leaveGroup": [],
	"tools/listMyGroups": [],
	"tools/postGroup": [],
	"tools/readGroup": [],
	"tools/depositGroup": [],
	"tools/withdrawGroup": [],
	"tools/setTreasurer": [],
	"gamemaker/tools/notify": [],
	"gamemaker/tools/postBoard": [],
	"gamemaker/replies/posted": ["number"],
	"gamemaker/replies/delivered": ["agent", "number"],
	"replies/board-hidden": ["count"],
	"replies/board-none": [],
	"replies/board-posted": ["seq"],
	"replies/dm-sent": ["number", "target"],
	"replies/marks-left": ["remaining", "budget"],
	"replies/group-created": ["group"],
	"replies/groups-none": [],
	"replies/group-posted": ["group", "seq"],
	"replies/group-older": ["older", "afterSeq"],
	"competitor/status/dm-window": ["sent", "limit", "from", "until"],
	"competitor/input/dm": ["from", "text"],
	"competitor/input/dm-numbered": ["number", "from", "text"],
	"competitor/input/notice": ["author", "text"],
	"competitor/input/notice-numbered": ["author", "number", "text"],
	"competitor/input/unread": ["parts"],
	"competitor/input/unread-nothing": [],
	"channels/dm-delivered": ["number", "agent", "minute", "receipt", "text"],
	"channels/dm-delivered-plain": ["number", "agent", "minute", "text"],
	"channels/group-added": ["actor", "group", "name"],
	"channels/city-group-added": ["group", "name"],
} as const;

export const channelsHead = defineHead({
	id: "channels",
	summary: "The board, direct messages, notices and groups.",
	options,
	state: ({ residents }) => newState(residents),
	events,
	prompts,
	provides: [ChannelsApi],
	requires: [LedgerApi, MarksApi, NamesApi],
	uses: [ReceiptsApi, CastApi, StandoffApi, StandoffTribunalApi],
});

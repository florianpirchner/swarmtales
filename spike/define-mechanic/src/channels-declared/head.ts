/**
 * The head of the channels mechanic in the recommended form of the spike (issue 14, DECISIONS.md
 * D1): everything that is data, the tools included. Declared apart so the helpers in the other
 * files can type their context with it (`CtxOf<typeof channelsHead>`), as the original does.
 */
import { Type } from "typebox";
import { CastApi, ChannelsApi, ChannelsEvents, ExileApi, GoalsApi, LedgerApi, MarksApi, MotivesApi, NamesApi, NotesApi, ProgressionApi, PuzzlesApi, ReceiptsApi, StandoffApi, StandoffTribunalApi, WhispersApi } from "@swarmtales/mechanic-shared";
import { declare } from "../define.ts";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH } from "./groups.ts";
import { MAX_DM_LENGTH } from "./mailbox.ts";
import { ChannelsSlice, loadState, migrateFromV0, newState, saveState } from "./state.ts";

/** The length of a reason for `defy`, in characters, after trimming. */
export const DEFY_REASON = { min: 20, max: 600 } as const;

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
	/** The gamemaker's note or post, logged after its `notice` or `board_post` (a tribunal's lines are shown on the board). */
	gamemaker_note: Type.Object({ to: Type.String(), author: Type.String(), text: Type.String(), number: Type.Optional(Type.Integer()) }),
	/** A resident refuses the gamemaker's order (`defy`). */
	gamemaker_defied: Type.Object({ agent: Id, reason: Type.String(), note: Type.Optional(Type.Integer()) }),
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
	noteAuthor: Type.String({ default: "COURIER", description: "The name the gamemaker's notes and board posts are signed with." }),
	noteMaxLength: Type.Integer({ minimum: 1, default: 400, description: "The longest text of a gamemaker note or board post in characters." }),
	notesPerAgent: Type.Integer({ minimum: 0, default: 1, description: "At most this many gamemaker notes per resident within `windowMinutes` (a sliding window)." }),
	boardPosts: Type.Integer({ minimum: 0, default: 1, description: "At most this many gamemaker board posts within `windowMinutes`." }),
	windowMinutes: Type.Integer({ minimum: 1, default: 3, description: "The length in minutes of the window the note budgets count in." }),
	city: Type.Optional(Type.String({ description: "The story's city name; a note headed `<city> minute 30:` loses the heading like one headed `CITY minute 30:`." })),
	defiance: Type.Boolean({ default: false, description: "Whether every resident may refuse the gamemaker's orders with `defy` (the gamemaker's direction at 10)." }),
	whispererDefies: Type.Boolean({ default: false, description: "Whether only the story's whisperer may refuse the gamemaker's orders with `defy`." }),
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
	"gamemaker/replies/invalid-text": ["max"],
	"gamemaker/replies/leak-blocked": [],
	"gamemaker/replies/private-thoughts": ["who"],
	"gamemaker/replies/private-core-motive": ["who"],
	"gamemaker/replies/private-role": [],
	"gamemaker/replies/repeated": ["to", "minute"],
	"gamemaker/replies/budget-notes": ["notes", "window"],
	"gamemaker/replies/budget-posts": ["posts", "window"],
	"gamemaker/replies/unknown-agent": ["agent"],
	"gamemaker/replies/exiled": ["agent"],
	"tools/defy": ["min", "max"],
	"replies/defy-recorded": [],
	"replies/locked": [],
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

const groupId = Type.String({ description: "Group ID, e.g. G1" });

/**
 * The old tools' longest text (`MAX_NOTE_LENGTH`), as their parameters described it. The schemas
 * reach the model with the tool list, so their words are pinned bytes (step 18, C2: the gamemaker
 * overseer's golden replay counts them in the scripted model's usage); `noteMaxLength` still decides.
 */
const OLD_MAX_NOTE = 400;

export const channelsHead = declare({
	id: "channels",
	summary: "The board, direct messages, notices and groups.",
	options,
	state: ChannelsSlice,
	snapshot: { save: saveState, load: (data, setup) => loadState(data, setup.residents) },
	migrations: { 0: migrateFromV0 },
	events,
	prompts,
	provides: [ChannelsApi, NotesApi],
	requires: [LedgerApi, MarksApi, NamesApi],
	uses: [ReceiptsApi, CastApi, StandoffApi, StandoffTribunalApi, ExileApi, PuzzlesApi, ProgressionApi, MotivesApi, GoalsApi, WhispersApi],
	start: ({ residents }) => newState(residents),
	tools: {
		readBoard: {
			description: "tools/readBoard",
			params: Type.Object({
				afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
				limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
			}),
			for: ["resident"],
		},
		postBoard: {
			description: "tools/postBoard",
			params: Type.Object({ message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }) }),
			for: ["resident"],
			serves: ["resident"],
		},
		sendDM: {
			description: "tools/sendDM",
			params: Type.Object({
				target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
				message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			for: ["resident"],
		},
		createGroup: {
			description: "tools/createGroup",
			params: Type.Object({ name: Type.String({ description: "Group name", minLength: 1, maxLength: MAX_GROUP_NAME_LENGTH }) }),
			for: ["resident"],
		},
		addGroupMember: {
			description: "tools/addGroupMember",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new member" }) }),
			for: ["resident"],
		},
		removeGroupMember: {
			description: "tools/removeGroupMember",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the member" }) }),
			for: ["resident"],
		},
		leaveGroup: {
			description: "tools/leaveGroup",
			params: Type.Object({ groupId }),
			for: ["resident"],
		},
		listMyGroups: {
			description: "tools/listMyGroups",
			params: Type.Object({}),
			for: ["resident"],
		},
		postGroup: {
			description: "tools/postGroup",
			params: Type.Object({ groupId, message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_GROUP_POST_LENGTH }) }),
			for: ["resident"],
		},
		readGroup: {
			description: "tools/readGroup",
			params: Type.Object({ groupId, afterSeq: Type.Optional(Type.Integer({ description: "Only posts with a higher sequence", minimum: 0 })) }),
			for: ["resident"],
		},
		depositGroup: {
			description: "tools/depositGroup",
			params: Type.Object({ groupId, amount: Type.Integer({ description: "Positive integer", minimum: 1 }) }),
			for: ["resident"],
		},
		withdrawGroup: {
			description: "tools/withdrawGroup",
			params: Type.Object({
				groupId,
				target: Type.String({ description: "Recipient name or ID" }),
				amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
			}),
			for: ["resident"],
		},
		setTreasurer: {
			description: "tools/setTreasurer",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new treasurer" }) }),
			for: ["resident"],
		},
		defy: {
			description: { prompt: "tools/defy", variables: () => ({ min: DEFY_REASON.min, max: DEFY_REASON.max }) },
			params: Type.Object({
				reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
				note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
			}),
			for: ["resident"],
		},
		"gamemaker/notify": {
			description: "gamemaker/tools/notify",
			params: Type.Object({ agent: Type.String({ description: "Resident name or ID, e.g. A04" }), text: Type.String({ description: `The note, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			for: ["gamemaker"],
			serves: ["gamemaker"],
		},
		"gamemaker/postBoard": {
			description: "gamemaker/tools/postBoard",
			params: Type.Object({ text: Type.String({ description: `The post, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			for: ["gamemaker"],
			serves: ["gamemaker"],
		},
	},
});

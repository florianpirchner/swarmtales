/**
 * The `channels` mechanic (carve step 4, team T2, docs/design/carve-team-T2.md): the public board,
 * DMs with their cap and marks, private notices and groups with treasuries. It provides
 * `ChannelsApi` (the city's posts and notices, message numbers, the DM window, the records blame
 * reads) and `NotesApi` (the gamemaker's note desk), writes the turn input kinds `dm`, `notice`
 * and `digest` and the `dmWindow` status part, and tells the arena's activation about unread mail
 * through the `news` hook. The turn inputs run in three phases (`HOOK_ORDER.turnInputs`): the
 * status part reads first, the inbox is emptied after every part that only reads, the digest last.
 *
 * Spike copy (issue 14, DECISIONS.md D1): the same mechanic in the one-object form of `../define.ts`.
 * The head (`head.ts`), the body (`index.ts`) and the tool lists (`tools.ts`, `gamemaker.ts`, `defy.ts`)
 * of the original are one object here; the rule code in the other files is unchanged.
 */
import { Type } from "typebox";
import type { ApiOutput, Refusal, ToolOutcome, TurnLine } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { CastApi, ChannelsApi, ChannelsEvents, ExileApi, ExileEvents, GoalsApi, HOOK_ORDER, LedgerApi, LISTENER_ORDER, MarksApi, MotivesApi, NamesApi, NotesApi, ProgressionApi, PuzzlesApi, ReceiptsApi, StandoffApi, StandoffTribunalApi, WhispersApi } from "@swarmtales/mechanic-shared";
import { mechanic } from "../define.ts";
import { boardPost, dmRecord, dmRecordOf, groupPost, pendingDms } from "./api.ts";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { DEFY_REASON, defyOpen } from "./defy.ts";
import { addGroupMember, createGroup, groupFailure, leaveGroup, listMyGroups, postGroup, readGroup, removeGroupMember, setTreasurer } from "./group-actions.ts";
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH } from "./groups.ts";
import { digestInputs, inboxInputs, news, statusInputs, turnEnded, turnOpened } from "./hooks.ts";
import { MAX_DM_LENGTH } from "./mailbox.ts";
import { deliverFrom, dmWindow, isGone, notify, note, postBoard, postToBoard, selfOf, sendDm } from "./messages.ts";
import { budgetRefusal, checkNote, noteBudget, recordNote, refusalFor, refusalOf } from "./notes.ts";
import { ChannelsSlice, loadState, migrateFromV0, newState, saveState } from "./state.ts";
import { createCityGroup, depositGroup, postGroupAsCity, removeCityGroup, settleTreasuries, withdrawGroup } from "./treasury.ts";

export { Board } from "./board.ts";
export { groupAccountId, GroupRegistry, MAX_FOUNDED_GROUPS, type GroupResult } from "./groups.ts";
export { Mailbox } from "./mailbox.ts";
export { MessageNumbers } from "./numbers.ts";

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

export const channels = mechanic({
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
	services: {
		notes: {
			check: (input, ctx): ApiOutput<typeof NotesApi, "check"> => checkNote(ctx, input.text, input.to, input.as),
			budget: (input, ctx): ApiOutput<typeof NotesApi, "budget"> => noteBudget(ctx, input.to),
			record: (input, ctx) => {
				recordNote(ctx, input.to, input.text, input.number, input.shown);
				return null;
			},
		},
		channels: {
			post: (input, ctx): ApiOutput<typeof ChannelsApi, "post"> => ({ postSeq: postToBoard(ctx, input.author, input.text, "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
			note: (input, ctx): ApiOutput<typeof ChannelsApi, "note"> => ({ number: note(ctx, input.to, input.author, input.text) }),
			deliver: (input, ctx): ApiOutput<typeof ChannelsApi, "deliver"> => ({ number: deliverFrom(ctx, input.from, input.to, input.text) }),
			takeNumber: (_input, ctx) => ctx.state.numbers.next(),
			dmWindow: (input, ctx): ApiOutput<typeof ChannelsApi, "dmWindow"> => dmWindow(ctx, input.resident),
			dmRecords: (_input, ctx) => ctx.state.dms.map(dmRecordOf),
			dmRecord: (input, ctx): ApiOutput<typeof ChannelsApi, "dmRecord"> => dmRecord(ctx, input.number),
			boardPost: (input, ctx): ApiOutput<typeof ChannelsApi, "boardPost"> => boardPost(ctx, input.number),
			groupPost: (input, ctx): ApiOutput<typeof ChannelsApi, "groupPost"> => groupPost(ctx, input.number),
			couldRead: (input, ctx) => ctx.state.groups.couldRead(input.group, input.reader, input.number),
			lastNumber: (_input, ctx) => ctx.state.numbers.last,
			pendingDms: (input, ctx): ApiOutput<typeof ChannelsApi, "pendingDms"> => pendingDms(ctx, input.resident),
			createCityGroup: (input, ctx): ApiOutput<typeof ChannelsApi, "createCityGroup"> => ({ group: createCityGroup(ctx, input.name, input.members) }),
			removeCityGroup: (input, ctx) => {
				removeCityGroup(ctx, input.group);
				return null;
			},
			postGroupAsCity: (input, ctx) => {
				postGroupAsCity(ctx, input.group, input.text);
				return null;
			},
		},
	},
	tools: {
		readBoard: {
			description: "tools/readBoard",
			params: Type.Object({
				afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
				limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
			}),
			for: ["resident"],
			run: ({ afterSeq, limit }, ctx): ToolOutcome => {
				const self = selfOf(ctx);
				const result = afterSeq === undefined ? ctx.state.board.takeUnread(self) : ctx.state.board.readFrom(self, afterSeq, limit ?? 50);
				const lines = result.posts.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`);
				if (result.skipped > 0) lines.push(ctx.prompt("replies/board-hidden", { count: result.skipped }));
				return reply(lines.length === 0 ? ctx.prompt("replies/board-none", {}) : lines.join("\n"));
			},
		},
		postBoard: {
			description: "tools/postBoard",
			params: Type.Object({ message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }) }),
			for: ["resident"],
			serves: ["resident"],
			guardText: ({ message }) => message,
			run: ({ message }, ctx): ToolOutcome => postBoard(ctx, message),
		},
		sendDM: {
			description: "tools/sendDM",
			params: Type.Object({
				target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
				message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			for: ["resident"],
			guardText: ({ message }) => message,
			run: ({ target, message }, ctx): ToolOutcome => sendDm(ctx, target, message),
		},
		createGroup: {
			description: "tools/createGroup",
			params: Type.Object({ name: Type.String({ description: "Group name", minLength: 1, maxLength: MAX_GROUP_NAME_LENGTH }) }),
			for: ["resident"],
			// A group name is guarded like a post (GUARDABLE_TOOLS: createGroup guards `name`).
			guardText: ({ name }) => name,
			run: ({ name }, ctx): ToolOutcome => createGroup(ctx, name),
		},
		addGroupMember: {
			description: "tools/addGroupMember",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new member" }) }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => addGroupMember(ctx, params.groupId, params.agent),
		},
		removeGroupMember: {
			description: "tools/removeGroupMember",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the member" }) }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => removeGroupMember(ctx, params.groupId, params.agent),
		},
		leaveGroup: {
			description: "tools/leaveGroup",
			params: Type.Object({ groupId }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => leaveGroup(ctx, params.groupId),
		},
		listMyGroups: {
			description: "tools/listMyGroups",
			params: Type.Object({}),
			for: ["resident"],
			run: (_params, ctx): ToolOutcome => listMyGroups(ctx),
		},
		postGroup: {
			description: "tools/postGroup",
			params: Type.Object({ groupId, message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_GROUP_POST_LENGTH }) }),
			for: ["resident"],
			// The old precheck: a failing post costs no guard call.
			check: (params, ctx): Refusal | undefined => {
				const checked = ctx.state.groups.checkPost(params.groupId, selfOf(ctx), params.message);
				return checked.ok ? undefined : groupFailure(checked);
			},
			guardText: ({ message }) => message,
			run: (params, ctx): ToolOutcome => postGroup(ctx, params.groupId, params.message),
		},
		readGroup: {
			description: "tools/readGroup",
			params: Type.Object({ groupId, afterSeq: Type.Optional(Type.Integer({ description: "Only posts with a higher sequence", minimum: 0 })) }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => readGroup(ctx, params.groupId, params.afterSeq),
		},
		depositGroup: {
			description: "tools/depositGroup",
			params: Type.Object({ groupId, amount: Type.Integer({ description: "Positive integer", minimum: 1 }) }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => depositGroup(ctx, params.groupId, params.amount),
		},
		withdrawGroup: {
			description: "tools/withdrawGroup",
			params: Type.Object({
				groupId,
				target: Type.String({ description: "Recipient name or ID" }),
				amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
			}),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => withdrawGroup(ctx, params.groupId, params.target, params.amount),
		},
		setTreasurer: {
			description: "tools/setTreasurer",
			params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new treasurer" }) }),
			for: ["resident"],
			run: (params, ctx): ToolOutcome => setTreasurer(ctx, params.groupId, params.agent),
		},
		defy: {
			description: { prompt: "tools/defy", variables: () => ({ min: DEFY_REASON.min, max: DEFY_REASON.max }) },
			params: Type.Object({
				reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
				note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
			}),
			for: ["resident"],
			run: ({ reason, note }, ctx): ToolOutcome => {
				const text = reason.trim();
				if (text.length < DEFY_REASON.min || text.length > DEFY_REASON.max) return refuse("INVALID_REASON", `${String(DEFY_REASON.min)}-${String(DEFY_REASON.max)} characters`);
				ctx.emit("gamemaker_defied", { agent: selfOf(ctx), reason: text, ...(note === undefined ? {} : { note }) });
				return reply(ctx.prompt("replies/defy-recorded", {}));
			},
		},
		"gamemaker/notify": {
			description: "gamemaker/tools/notify",
			params: Type.Object({ agent: Type.String({ description: "Resident name or ID, e.g. A04" }), text: Type.String({ description: `The note, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			for: ["gamemaker"],
			serves: ["gamemaker"],
			run: (params, ctx): ToolOutcome => {
				if (!ctx.residents.has(params.agent)) return refuse("UNKNOWN_AGENT", params.agent);
				if (isGone(ctx, params.agent)) return refusalFor(refusalOf(ctx.prompt("gamemaker/replies/exiled", { agent: params.agent })));
				const checked = checkNote(ctx, params.text, params.agent);
				if (!checked.ok) return refusalFor(checked);
				const spent = budgetRefusal(ctx, params.agent);
				if (spent !== undefined) return spent;
				const number = note(ctx, params.agent, ctx.options.noteAuthor, checked.text);
				recordNote(ctx, params.agent, checked.text, number);
				return reply(ctx.prompt("gamemaker/replies/delivered", { agent: params.agent, number }));
			},
		},
		"gamemaker/postBoard": {
			description: "gamemaker/tools/postBoard",
			params: Type.Object({ text: Type.String({ description: `The post, 1-${String(OLD_MAX_NOTE)} characters` }) }),
			for: ["gamemaker"],
			serves: ["gamemaker"],
			run: (params, ctx): ToolOutcome => {
				const checked = checkNote(ctx, params.text, "board");
				if (!checked.ok) return refusalFor(checked);
				const spent = budgetRefusal(ctx, "board");
				if (spent !== undefined) return spent;
				const post = postToBoard(ctx, ctx.options.noteAuthor, checked.text, "city");
				recordNote(ctx, "board", checked.text, post.seq);
				return reply(ctx.prompt("gamemaker/replies/posted", { number: post.seq }));
			},
		},
	},
	listeners: (kit) => [
		// At once and first: code that runs right after an exile in the same call must see it (old `#exiled`).
		kit.listen(
			ExileEvents,
			"exiled",
			(payload, ctx) => {
				ctx.state.exiled.add(payload.agent);
			},
			{ immediate: true, order: LISTENER_ORDER.exiled.channels },
		),
	],
	// `defy` is open to all (`defiance`) or to the whisperer alone (`whispererDefies`); asked live, so a resume keeps it (R2-D5).
	pipeline: {
		lock: (call, ctx): Refusal | undefined => (call.owner === "channels" && call.tool === "defy" && call.resident !== undefined && !defyOpen(ctx, call.resident) ? refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {})) : undefined),
	},
	hooks: {
		turnInputs: [
			{ order: HOOK_ORDER.turnInputs.status, run: (resident, ctx): readonly TurnLine[] => statusInputs(resident, ctx) },
			{ order: HOOK_ORDER.turnInputs.channelsInbox, run: (resident, ctx): readonly TurnLine[] => inboxInputs(resident, ctx) },
			{ order: HOOK_ORDER.turnInputs.channelsDigest, run: (resident, ctx): readonly TurnLine[] => digestInputs(resident, ctx) },
		],
		news: (resident, ctx): boolean => news(resident, ctx),
		turnOpened: (resident, ctx) => {
			turnOpened(resident, ctx);
		},
		turnEnded: (resident, ctx) => {
			turnEnded(resident, ctx);
		},
		runEnded: {
			order: HOOK_ORDER.runEnded.channels,
			run: (_reason, ctx) => {
				settleTreasuries(ctx);
			},
		},
	},
	facts: {
		messages: { output: Type.Integer(), compute: (view) => view.state.numbers.last },
		boardPosts: { output: Type.Integer(), compute: (view) => view.state.board.all().length },
		unreadDms: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => Object.fromEntries([...view.state.inboxes].map(([id, inbox]) => [id, inbox.mailbox.size])) },
	},
});

/** The head, as the original exports it: plain data, read without running a handler. */
export const channelsHead = channels.head;

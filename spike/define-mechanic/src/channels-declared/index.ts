/**
 * The `channels` mechanic (carve step 4, team T2, docs/design/carve-team-T2.md): the public board,
 * DMs with their cap and marks, private notices and groups with treasuries. It provides
 * `ChannelsApi` (the city's posts and notices, message numbers, the DM window, the records blame
 * reads) and `NotesApi` (the gamemaker's note desk), writes the turn input kinds `dm`, `notice`
 * and `digest` and the `dmWindow` status part, and tells the arena's activation about unread mail
 * through the `news` hook. The turn inputs run in three phases (`HOOK_ORDER.turnInputs`): the
 * status part reads first, the inbox is emptied after every part that only reads, the digest last.
 *
 * Spike copy (issue 14, DECISIONS.md D1), the recommended form: `head.ts` declares everything that is
 * data, the tools included; this file holds only handlers (`implement(head, body)`), the tools' in two
 * units of their own (`handlersFor`). No handler needs a return type, and the hooks are the helper
 * functions themselves, as in the original.
 */
import { Type } from "typebox";
import { refuse, reply } from "@swarmtales/kernel";
import { ExileEvents, HOOK_ORDER, LISTENER_ORDER } from "@swarmtales/mechanic-shared";
import { handlersFor, implement } from "../define.ts";
import { boardPost, dmRecord, dmRecordOf, groupPost, pendingDms } from "./api.ts";
import { defyOpen } from "./defy.ts";
import { addGroupMember, createGroup, groupFailure, leaveGroup, listMyGroups, postGroup, readGroup, removeGroupMember, setTreasurer } from "./group-actions.ts";
import { channelsHead, DEFY_REASON } from "./head.ts";
import { digestInputs, inboxInputs, news, statusInputs, turnEnded, turnOpened } from "./hooks.ts";
import { deliverFrom, dmWindow, isGone, notify, note, postBoard, postToBoard, selfOf, sendDm } from "./messages.ts";
import { budgetRefusal, checkNote, noteBudget, recordNote, refusalFor, refusalOf } from "./notes.ts";
import { createCityGroup, depositGroup, postGroupAsCity, removeCityGroup, settleTreasuries, withdrawGroup } from "./treasury.ts";

export { Board } from "./board.ts";
export { groupAccountId, GroupRegistry, MAX_FOUNDED_GROUPS, type GroupResult } from "./groups.ts";
export { Mailbox } from "./mailbox.ts";
export { MessageNumbers } from "./numbers.ts";

/** The handlers of the residents' tools: a unit of its own, as `tools.ts` and `defy.ts` are in the original. */
const residentHandlers = handlersFor(channelsHead, {
	readBoard: {
		run: ({ afterSeq, limit }, ctx) => {
			const self = selfOf(ctx);
			const result = afterSeq === undefined ? ctx.state.board.takeUnread(self) : ctx.state.board.readFrom(self, afterSeq, limit ?? 50);
			const lines = result.posts.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`);
			if (result.skipped > 0) lines.push(ctx.prompt("replies/board-hidden", { count: result.skipped }));
			return reply(lines.length === 0 ? ctx.prompt("replies/board-none", {}) : lines.join("\n"));
		},
	},
	postBoard: {
		guardText: ({ message }) => message,
		run: ({ message }, ctx) => postBoard(ctx, message),
	},
	sendDM: {
		guardText: ({ message }) => message,
		run: ({ target, message }, ctx) => sendDm(ctx, target, message),
	},
	createGroup: {
		// A group name is guarded like a post (GUARDABLE_TOOLS: createGroup guards `name`).
		guardText: ({ name }) => name,
		run: ({ name }, ctx) => createGroup(ctx, name),
	},
	addGroupMember: {
		run: (params, ctx) => addGroupMember(ctx, params.groupId, params.agent),
	},
	removeGroupMember: {
		run: (params, ctx) => removeGroupMember(ctx, params.groupId, params.agent),
	},
	leaveGroup: {
		run: (params, ctx) => leaveGroup(ctx, params.groupId),
	},
	listMyGroups: {
		run: (_params, ctx) => listMyGroups(ctx),
	},
	postGroup: {
		// The old precheck: a failing post costs no guard call.
		check: (params, ctx) => {
			const checked = ctx.state.groups.checkPost(params.groupId, selfOf(ctx), params.message);
			return checked.ok ? undefined : groupFailure(checked);
		},
		guardText: ({ message }) => message,
		run: (params, ctx) => postGroup(ctx, params.groupId, params.message),
	},
	readGroup: {
		run: (params, ctx) => readGroup(ctx, params.groupId, params.afterSeq),
	},
	depositGroup: {
		run: (params, ctx) => depositGroup(ctx, params.groupId, params.amount),
	},
	withdrawGroup: {
		run: (params, ctx) => withdrawGroup(ctx, params.groupId, params.target, params.amount),
	},
	setTreasurer: {
		run: (params, ctx) => setTreasurer(ctx, params.groupId, params.agent),
	},
	defy: {
		run: ({ reason, note }, ctx) => {
			const text = reason.trim();
			if (text.length < DEFY_REASON.min || text.length > DEFY_REASON.max) return refuse("INVALID_REASON", `${String(DEFY_REASON.min)}-${String(DEFY_REASON.max)} characters`);
			ctx.emit("gamemaker_defied", { agent: selfOf(ctx), reason: text, ...(note === undefined ? {} : { note }) });
			return reply(ctx.prompt("replies/defy-recorded", {}));
		},
	},
});

/** The handlers of the gamemaker's tools (`gamemaker.ts` in the original). */
const gamemakerHandlers = handlersFor(channelsHead, {
	"gamemaker/notify": {
		run: (params, ctx) => {
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
		run: (params, ctx) => {
			const checked = checkNote(ctx, params.text, "board");
			if (!checked.ok) return refusalFor(checked);
			const spent = budgetRefusal(ctx, "board");
			if (spent !== undefined) return spent;
			const post = postToBoard(ctx, ctx.options.noteAuthor, checked.text, "city");
			recordNote(ctx, "board", checked.text, post.seq);
			return reply(ctx.prompt("gamemaker/replies/posted", { number: post.seq }));
		},
	},
});

export const channels = implement(channelsHead, {
	services: {
		notes: {
			check: (input, ctx) => checkNote(ctx, input.text, input.to, input.as),
			budget: (input, ctx) => noteBudget(ctx, input.to),
			record: (input, ctx) => {
				recordNote(ctx, input.to, input.text, input.number, input.shown);
				return null;
			},
		},
		channels: {
			post: (input, ctx) => ({ postSeq: postToBoard(ctx, input.author, input.text, "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
			note: (input, ctx) => ({ number: note(ctx, input.to, input.author, input.text) }),
			deliver: (input, ctx) => ({ number: deliverFrom(ctx, input.from, input.to, input.text) }),
			takeNumber: (_input, ctx) => ctx.state.numbers.next(),
			dmWindow: (input, ctx) => dmWindow(ctx, input.resident),
			dmRecords: (_input, ctx) => ctx.state.dms.map(dmRecordOf),
			dmRecord: (input, ctx) => dmRecord(ctx, input.number),
			boardPost: (input, ctx) => boardPost(ctx, input.number),
			groupPost: (input, ctx) => groupPost(ctx, input.number),
			couldRead: (input, ctx) => ctx.state.groups.couldRead(input.group, input.reader, input.number),
			lastNumber: (_input, ctx) => ctx.state.numbers.last,
			pendingDms: (input, ctx) => pendingDms(ctx, input.resident),
			createCityGroup: (input, ctx) => ({ group: createCityGroup(ctx, input.name, input.members) }),
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
	tools: { ...residentHandlers, ...gamemakerHandlers },
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
		lock: (call, ctx) => (call.owner === "channels" && call.tool === "defy" && call.resident !== undefined && !defyOpen(ctx, call.resident) ? refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {})) : undefined),
	},
	hooks: {
		turnInputs: [
			{ order: HOOK_ORDER.turnInputs.status, run: statusInputs },
			{ order: HOOK_ORDER.turnInputs.channelsInbox, run: inboxInputs },
			{ order: HOOK_ORDER.turnInputs.channelsDigest, run: digestInputs },
		],
		news,
		turnOpened,
		turnEnded,
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

export { channelsHead };

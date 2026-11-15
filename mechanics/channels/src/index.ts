// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `channels` mechanic: talk in the city. Residents post on the public board, read it and send each other direct
 * messages; they found private groups, post and read there and keep a shared treasury in the ledger, which is split
 * among the members at the run's end. Other mechanics speak as the city through `ChannelsService` (a post, a private
 * notice that its reader finds at its next activation, the city's own groups) and read the records of the direct
 * messages and the groups there. Every message a reader can cite has one number from one counter. A game may cap the
 * direct messages and memos of a window (`dmLimit`), let residents refuse a Director's order (`defy`) and end each
 * activation with the line of unread posts (`digest`). With a provider of `identity` residents read names and may
 * write them where an id goes; with a provider of `allowance` a message's reply says the marks left.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { LedgerEvents } from "@swarmtales/mechanic-ledger/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { ChannelsEvents, ChannelsService } from "./contract.ts";
import { defy, defyLock } from "./defy.ts";
import { sendDm } from "./dms.ts";
import { addGroupMember, checkGroupPost, createGroup, leaveGroup, listMyGroups, postGroup, readGroup, removeGroupMember, setTreasurer } from "./group-actions.ts";
import { groupSamples } from "./group-samples.ts";
import { channelsHead } from "./head.ts";
import { activationClosed, inboxInputs, news } from "./hooks.ts";
import { sampleDm, samplePost, sampleRead } from "./samples.ts";
import { notify, postBoard, postToBoard, readBoard } from "./messages.ts";
import { resolved, shownOutcome, shownRefusal } from "./shown.ts";
import { createCityGroup, depositGroup, postGroupAsCity, removeCityGroup, settleTreasuries, withdrawGroup } from "./treasury.ts";
import { memoCap } from "./window.ts";

export { ChannelsEvents, ChannelsService };

const samples = groupSamples();

/**
 * The `channels` mechanic. Calling it gives the use for a game's `mechanics` list.
 *
 * @example
 * ```ts
 * defineGame({ id: "town", residents: 3, mechanics: [channels({ dmLimit: { windowMinutes: 6, perWindow: 8 } })], end: { ticks: 4 } });
 * ```
 *
 * @public
 */
export const channels = defineMechanic(channelsHead, {
	services: {
		notices: {
			post: (input, ctx) => ({ postSeq: postToBoard(ctx, input.author, input.text, "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
		},
		channels: {
			post: (input, ctx) => ({ postSeq: postToBoard(ctx, input.author, input.text, input.kind ?? "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
			dmRecords: (_input, ctx) => ctx.state.dms.map(({ from, to, text, number, tick, answered }) => ({ from, to, text, number, tick, answered })),
			createCityGroup: (input, ctx) => ({ group: createCityGroup(ctx, input.name, input.members) }),
			removeCityGroup: (input, ctx) => {
				removeCityGroup(ctx, input.group);
				return null;
			},
			postGroupAsCity: (input, ctx) => {
				postGroupAsCity(ctx, input.group, input.text);
				return null;
			},
			group: (input, ctx) => {
				const found = ctx.state.groups.info(input.group);
				return found === undefined ? null : { ...found, members: [...found.members], removed: !ctx.state.groups.liveIds().includes(found.id) };
			},
			groupPost: (input, ctx) => {
				const found = ctx.state.groups.postByNumber(input.number);
				return found === undefined ? null : { number: found.post.seq, group: found.group, author: found.post.author, text: found.post.text, tick: found.post.tick };
			},
			couldRead: (input, ctx) => ctx.state.groups.couldRead(input.group, input.reader, input.number),
		},
	},
	tools: {
		readBoard: { sample: sampleRead, run: (params, ctx) => shownOutcome(ctx, readBoard(ctx, params.afterSeq, params.limit)) },
		// The checks of a post and of a message run in `execute`, where the old platform logged their refusals.
		postBoard: { sample: samplePost, run: (params, ctx) => shownOutcome(ctx, postBoard(ctx, params.message)) },
		sendDM: { sample: sampleDm, run: (params, ctx) => shownOutcome(ctx, sendDm(ctx, resolved(ctx, params.target), params.message)) },
		createGroup: { sample: samples.createGroup, run: (params, ctx) => shownOutcome(ctx, createGroup(ctx, params.name)) },
		addGroupMember: { sample: samples.addGroupMember, run: (params, ctx) => shownOutcome(ctx, addGroupMember(ctx, params.groupId, resolved(ctx, params.agent))) },
		removeGroupMember: { sample: samples.removeGroupMember, run: (params, ctx) => shownOutcome(ctx, removeGroupMember(ctx, params.groupId, resolved(ctx, params.agent))) },
		leaveGroup: { sample: samples.leaveGroup, run: (params, ctx) => shownOutcome(ctx, leaveGroup(ctx, params.groupId)) },
		listMyGroups: { sample: samples.listMyGroups, run: (_params, ctx) => shownOutcome(ctx, listMyGroups(ctx)) },
		postGroup: {
			sample: samples.postGroup,
			check: (params, ctx) => shownRefusal(ctx, checkGroupPost(ctx, params.groupId, params.message)),
			run: (params, ctx) => shownOutcome(ctx, postGroup(ctx, params.groupId, params.message)),
		},
		readGroup: { sample: samples.readGroup, run: (params, ctx) => shownOutcome(ctx, readGroup(ctx, params.groupId, params.afterSeq)) },
		depositGroup: { sample: samples.depositGroup, run: (params, ctx) => shownOutcome(ctx, depositGroup(ctx, params.groupId, params.amount)) },
		withdrawGroup: { sample: samples.withdrawGroup, run: (params, ctx) => shownOutcome(ctx, withdrawGroup(ctx, params.groupId, resolved(ctx, params.target), params.amount)) },
		setTreasurer: { sample: samples.setTreasurer, run: (params, ctx) => shownOutcome(ctx, setTreasurer(ctx, params.groupId, resolved(ctx, params.agent))) },
		defy: { run: (params, ctx) => defy(ctx, params.reason, params.note) },
	},
	// `defy` is closed unless the game opens it; a memo past the window of the cap is refused like a direct message.
	pipeline: {
		lock: (call, ctx) => (call.resident === undefined ? undefined : defyLock(call.tool, call.owner, ctx)),
		rule: (call, ctx) => memoCap(call.tool, call.resident, call.params, ctx),
	},
	listeners: (kit) => [
		kit.listen(LedgerEvents, "transfer", (transfer, ctx) => {
			if (transfer.memo.length > 0) ctx.state.memos.push({ from: transfer.from, tick: ctx.tick });
		}),
	],
	hooks: {
		turnInputs: inboxInputs,
		activationClosed,
		news,
		// Without `after:`: a base mechanic names no game mechanic, so a game orders the old closers of acts and
		// petitions before this one (erratum J14 of 12-m5-spec.md).
		runEnded: (_end, ctx) => {
			settleTreasuries(ctx);
		},
	},
	facts: {
		messages: { output: Type.Integer({ description: "The city's last message number" }), compute: (view) => view.state.numbers.last },
		boardPosts: { output: Type.Integer({ description: "The posts on the board" }), compute: (view) => view.state.board.all().length },
	},
});

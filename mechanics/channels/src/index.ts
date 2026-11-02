/**
 * The `channels` mechanic (carve step 4, team T2, docs/design/carve-team-T2.md): the public board,
 * DMs with their cap and marks, private notices and groups with treasuries. It provides
 * `ChannelsApi` (the city's posts and notices, message numbers, the DM window, the records blame
 * reads) and `NotesApi` (the gamemaker's note desk), writes the turn input kinds `dm`, `notice`
 * and `digest` and the `dmWindow` status part, and tells the arena's activation about unread mail
 * through the `news` hook. The turn inputs run in three phases (`HOOK_ORDER.turnInputs`): the
 * status part reads first, the inbox is emptied after every part that only reads, the digest last.
 */
import { Type } from "typebox";
import { defineMechanic, refuse } from "@swarmtales/kernel";
import { ChannelsApi, ExileEvents, HOOK_ORDER, LISTENER_ORDER, NotesApi } from "@swarmtales/mechanic-shared";
import { boardPost, dmRecord, dmRecordOf, groupPost, pendingDms } from "./api.ts";
import { defyOpen, defyTool } from "./defy.ts";
import { gamemakerTools } from "./gamemaker.ts";
import { createCityGroup, removeCityGroup, postGroupAsCity, settleTreasuries } from "./treasury.ts";
import { channelsHead } from "./head.ts";
import { digestInputs, inboxInputs, news, statusInputs, turnEnded, turnOpened } from "./hooks.ts";
import { deliverFrom, dmWindow, notify, note, postToBoard } from "./messages.ts";
import { checkNote, noteBudget, recordNote } from "./notes.ts";
import { ChannelsSlice, loadState, migrateFromV0, saveState } from "./state.ts";
import { residentTools } from "./tools.ts";

export { channelsHead };

export const channels = defineMechanic(channelsHead, (kit) => ({
	services: [
		kit.provide(NotesApi, {
			check: (input, ctx) => checkNote(ctx, input.text, input.to, input.as),
			budget: (input, ctx) => noteBudget(ctx, input.to),
			record: (input, ctx) => {
				recordNote(ctx, input.to, input.text, input.number, input.shown);
				return null;
			},
		}),
		kit.provide(ChannelsApi, {
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
		}),
	],
	tools: [...residentTools(kit), defyTool(kit), ...gamemakerTools(kit)],
	listeners: [
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
		messages: kit.fact(Type.Integer(), (view) => view.state.numbers.last),
		boardPosts: kit.fact(Type.Integer(), (view) => view.state.board.all().length),
		unreadDms: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries([...view.state.inboxes].map(([id, inbox]) => [id, inbox.mailbox.size]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ChannelsSlice,
		save: saveState,
		load: (data, setup) => loadState(data, setup.residents),
		migrations: { 0: migrateFromV0 },
	}),
}));

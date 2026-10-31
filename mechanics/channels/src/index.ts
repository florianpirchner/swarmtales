/**
 * The `channels` mechanic (carve step 4, team T2, docs/design/carve-team-T2.md): the public board,
 * DMs with their cap and marks, private notices and groups with treasuries. It provides
 * `ChannelsApi` (the city's posts and notices, message numbers, the DM window), writes the turn
 * input kinds `dm`, `notice` and `digest` and the `dmWindow` status part, and tells the arena's
 * activation about unread mail through the `news` hook.
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, ExileEvents, NotesApi } from "@swarmtales/mechanic-shared";
import { gamemakerTools } from "./gamemaker.ts";
import { createCityGroup, removeCityGroup, postGroupAsCity, settleTreasuries } from "./treasury.ts";
import { channelsHead } from "./head.ts";
import { news, turnEnded, turnInputs, turnOpened } from "./hooks.ts";
import { deliverFrom, dmWindow, notify, note, postToBoard } from "./messages.ts";
import { ChannelsSlice, loadState, migrateFromV0, saveState } from "./state.ts";
import { residentTools } from "./tools.ts";

export { channelsHead };

export const channels = defineMechanic(channelsHead, (kit) => ({
	services: [
		// Wave 3.5 (carve-decisions.md): the note desk is T2's to write in round 2.
		kit.provideSome(NotesApi, {}),
		kit.provideSome(ChannelsApi, {
			post: (input, ctx) => ({ postSeq: postToBoard(ctx, input.author, input.text, "city").seq }),
			notify: (input, ctx) => {
				notify(ctx, input.to, input.author, input.text);
				return null;
			},
			note: (input, ctx) => ({ number: note(ctx, input.to, input.author, input.text) }),
			deliver: (input, ctx) => ({ number: deliverFrom(ctx, input.from, input.to, input.text) }),
			takeNumber: (_input, ctx) => ctx.state.numbers.next(),
			dmWindow: (input, ctx) => dmWindow(ctx, input.resident),
			dmRecords: (_input, ctx) => ctx.state.dms.map((record) => ({ id: record.id, from: record.from, to: record.to, minute: record.minute, answered: record.answered, text: record.text })),
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
	tools: [...residentTools(kit), ...gamemakerTools(kit)],
	listeners: [
		kit.listen(ExileEvents, "exiled", (payload, ctx) => {
			ctx.state.exiled.add(payload.agent);
		}),
	],
	hooks: {
		turnInputs,
		news,
		turnOpened,
		turnEnded,
		runEnded: (_reason, ctx) => {
			settleTreasuries(ctx);
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

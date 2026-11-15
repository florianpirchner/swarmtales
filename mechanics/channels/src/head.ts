// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of `channels`: its state with the snapshot, its events, its services, its prompts and its tools. */
import { Type } from "typebox";
import { AllowanceService, IdentityService, NoticesService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { ChannelsService, NotesService } from "./contract.ts";
import { ChannelsEvents } from "./events.ts";
import { GROUP_PROMPTS, GROUP_TOOLS } from "./group-specs.ts";
import { MAX_DM_LENGTH } from "./mailbox.ts";
import { ChannelsSlice, loadState, newState, saveState, withoutGroups, withoutMemos, withoutNotes, type ChannelsState } from "./state.ts";

/**
 * The head of `channels`: everything that can be read without running a handler.
 *
 * @public
 */
export const channelsHead = defineHead({
	id: "channels",
	package: "@swarmtales/mechanic-channels",
	summary: "Talk in the city: the public board, direct messages, private notices and groups with a treasury.",
	options: Type.Object({
		dmLimit: Type.Optional(
			Type.Object(
				{
					windowMinutes: Type.Integer({ minimum: 1, description: "Length of one DM allowance window in ticks; windows are counted from tick 0." }),
					perWindow: Type.Integer({ minimum: 0, description: "DMs and memo transfers one resident may send in one window." }),
				},
				{ description: "The DM cap (the old story's `rules.dmLimit`); without it residents may send as many DMs as the mailboxes allow." },
			),
		),
		defiance: Type.Boolean({ default: false, description: "Whether residents may refuse a Director's orders with `defy`." }),
		digest: Type.Boolean({ default: false, description: "Whether each activation ends with the line of unread posts (`[unread] board 3 · group G1 2`, or `[unread] nothing`)." }),
		noteAuthor: Type.String({ default: "COURIER", description: "The name a Director's notes and board posts are signed with." }),
		noteMaxLength: Type.Integer({ minimum: 1, default: 400, description: "The longest text of a Director's note or board post in characters." }),
		notesPerAgent: Type.Integer({ minimum: 0, default: 1, description: "At most this many notes of a Director per resident within `windowMinutes` (a sliding window)." }),
		boardPosts: Type.Integer({ minimum: 0, default: 1, description: "At most this many board posts of a Director within `windowMinutes`." }),
		windowMinutes: Type.Integer({ minimum: 1, default: 3, description: "The length in ticks of the window the note budgets count in." }),
		city: Type.Optional(Type.String({ description: "The game's city name; a note headed `<city> minute 30:` loses the heading like one headed `CITY minute 30:`." })),
	}),
	state: ChannelsSlice,
	start: ({ residents }): ChannelsState => newState(residents),
	snapshot: { save: (state: ChannelsState) => saveState(state), load: (data, setup): ChannelsState => loadState(data, setup.residents) },
	version: 4,
	migrations: { 1: withoutGroups, 2: withoutMemos, 3: withoutNotes },
	events: ChannelsEvents.events,
	provides: [ChannelsService, NoticesService, NotesService],
	uses: [LedgerService, ReceiptSourceService, IdentityService, AllowanceService],
	prompts: {
		"channels/tools/readBoard": [],
		"channels/tools/postBoard": [],
		"channels/tools/sendDM": [],
		"channels/replies/board-hidden": ["count"],
		"channels/replies/board-none": [],
		"channels/replies/board-posted": ["seq"],
		"channels/replies/dm-sent": ["number", "target"],
		"channels/input/dm": ["number", "from", "text"],
		"channels/input/notice": ["author", "text"],
		"channels/notices/dm-delivered": ["number", "agent", "minute", "text"],
		...GROUP_PROMPTS,
		"channels/tools/defy": [],
		"channels/replies/defy-recorded": [],
		"channels/replies/locked": [],
		"channels/replies/marks-left": ["remaining", "budget"],
		"channels/status/dm-window": ["sent", "limit", "from", "until"],
		"channels/input/unread": ["parts"],
		"channels/input/unread-nothing": [],
		"channels/input/notice-numbered": ["author", "number", "text"],
		"channels/tools/notify": [],
		"channels/tools/boardNote": [],
		"channels/notes/posted": ["number"],
		"channels/notes/delivered": ["agent", "number"],
		"channels/notes/invalid-text": ["max"],
		"channels/notes/repeated": ["to", "minute"],
		"channels/notes/budget-notes": ["notes", "window"],
		"channels/notes/budget-posts": ["posts", "window"],
		"channels/notes/exiled": ["agent"],
	},
	tools: {
		readBoard: {
			description: "channels/tools/readBoard",
			params: Type.Object({
				afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
				limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
			}),
			for: ["resident"],
		},
		postBoard: {
			description: "channels/tools/postBoard",
			params: Type.Object({ message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }) }),
			for: ["resident"],
		},
		sendDM: {
			description: "channels/tools/sendDM",
			params: Type.Object({
				target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
				message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			for: ["resident"],
		},
		...GROUP_TOOLS,
		defy: {
			description: "channels/tools/defy",
			params: Type.Object({
				reason: Type.String({ description: "Why your character refuses, in its own voice", minLength: 1, maxLength: 1_000 }),
				note: Type.Optional(Type.Integer({ description: "The number of the gamemaker's note you refuse, e.g. 312", minimum: 1 })),
			}),
			for: ["resident"],
		},
		// The words of the two schemas reach the model with the tool list, so the old 400 stays in them; `noteMaxLength` decides.
		notify: {
			description: "channels/tools/notify",
			params: Type.Object({ agent: Type.String({ description: "Resident name or ID, e.g. A04" }), text: Type.String({ description: "The note, 1-400 characters" }) }),
			for: ["gamemaker"],
		},
		boardNote: {
			description: "channels/tools/boardNote",
			params: Type.Object({ text: Type.String({ description: "The post, 1-400 characters" }) }),
			for: ["gamemaker"],
		},
	},
});

/** The context of the hooks and the service of `channels`. */
export type Ctx = CtxOf<typeof channelsHead>;

/** The context of the tools of `channels`. */
export type ToolCtx = ToolCtxOf<typeof channelsHead>;

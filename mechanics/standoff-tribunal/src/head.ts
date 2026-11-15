// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of `standoff-tribunal`: its options (carried), its state with the snapshot, its events, prompts and tools. */
import { Type } from "typebox";
import { CapExemptionService, IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService, NotesService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { HoldoutPiecesService, StandoffTribunalEvents } from "./contract.ts";
import { HoldoutSlice, loadHoldout, saveHoldout } from "./slice.ts";
import { emptyHoldout } from "./types.ts";

const text = (description: string) => Type.String({ description });

/** The old note cap of the gamemaker's texts (system-prompt.ts `MAX_NOTE_LENGTH`), for the parameter descriptions. */
const MAX_NOTE_LENGTH = 400;

/**
 * The options of the holdout tribunal (carried; the game's `holdout`).
 *
 * @public
 */
export const StandoffTribunalOptions = Type.Object(
	{
		stallMinutes: Type.Integer({ minimum: 1, description: "Minutes a resident stands at a door, and another before it without its fragment, before the city reports a blocker; also the pause after a tribunal." }),
		graceMinutes: Type.Integer({ minimum: 0, description: "Whole minutes of turns the accused has after the call to send its fragment to everyone who lacks it." }),
		voteMinutes: Type.Integer({ minimum: 1, description: "How long one secret vote on banishment runs, in minutes." }),
		maxVotes: Type.Integer({ minimum: 1, description: "Votes in all; after the last one fails the lot strikes, once per door." }),
		fallbackMinutes: Type.Integer({ minimum: 0, description: "Minutes the city waits for the gamemaker to announce or strike before it does so itself." }),
		author: Type.String({ default: "COURIER", description: "The gamemaker's name on the tribunal's posts and notices, e.g. COURIER." }),
		texts: Type.Object(
			{
				rule: text("The rule as every door's task states it."),
				called: text("The procedure under the gamemaker's announcement ({accused}, {door}, {lacking}, {grace}, {graceUntil}, {vote}, {maxVotes})."),
				drawnAccused: text("Added when the city drew the accused among several blockers ({candidates}, {drawn})."),
				voteOpened: text("Notice to every voter when a vote opens ({accused}, {number}, {maxVotes}, {until})."),
				accusedVote: text("Notice to the accused when a vote on it opens ({accused}, {number}, {maxVotes}, {until})."),
				struck: text("Board post when a resident is struck ({struck})."),
				struckNotice: text("The struck resident's final notice ({struck})."),
				released: text("Notice to everyone left with the struck resident's fragment of the door open to them ({struck}, {fragments})."),
				dropped: text("The city's line when the accused fixed it ({accused})."),
				graceFailed: text("The city's line when the grace ran out ({accused}, {until})."),
				voteFailed: text("The city's line when a vote was not unanimous ({accused}, {number}, {yes}, {no}, {left}, {until})."),
				banished: text("The city's line when it strikes the banished itself ({accused}, {yes})."),
				lot: text("The city's line when it draws and strikes itself ({accused}, {drawn})."),
				spared: text("The city's line when every vote failed at a door the lot struck before ({accused}, {door})."),
			},
			{ description: "The story's texts of the holdout tribunal (old `HoldoutTexts`)." },
		),
	},
	{ description: "The options of the holdout tribunal" },
);

const Accused = Type.Array(Type.String({ description: "Resident name or ID, e.g. A04" }), {
	description: "Residents the report names as blockers; when it names more than one, the city draws the accused by lot among all of them",
	minItems: 1,
	maxItems: 12,
});

/**
 * The head of the holdout tribunal: everything that can be read without running a handler.
 *
 * @public
 */
export const standoffTribunalHead = defineHead({
	id: "standoff-tribunal",
	package: "@swarmtales/mechanic-standoff-tribunal",
	summary: "The holdout tribunal over a resident who keeps a fragment back.",
	options: StandoffTribunalOptions,
	state: HoldoutSlice,
	start: () => ({ data: emptyHoldout() }),
	snapshot: { save: saveHoldout, load: loadHoldout },
	events: StandoffTribunalEvents.events,
	prompts: {
		"standoff-tribunal/tools/tribunalVote": [],
		"standoff-tribunal/replies/ballot-holdout": ["vote", "accused", "number", "until"],
		"standoff-tribunal/replies/ballot-yes": [],
		"standoff-tribunal/replies/ballot-no": [],
		"standoff-tribunal/replies/locked": [],
		"standoff-tribunal/gamemaker/tools/callTribunal": [],
		"standoff-tribunal/gamemaker/tools/drawLot": [],
		"standoff-tribunal/gamemaker/tools/announceTribunal": [],
		"standoff-tribunal/gamemaker/tools/permaDeath": [],
		"standoff-tribunal/gamemaker/replies/tribunal-called": ["accused", "lot", "door", "until", "lacking"],
		"standoff-tribunal/gamemaker/replies/tribunal-lot": ["candidates", "accused"],
		"standoff-tribunal/gamemaker/replies/lot-drawn": ["drawn"],
		"standoff-tribunal/gamemaker/replies/announced": ["value"],
		"standoff-tribunal/gamemaker/replies/struck": ["agent", "how"],
		"standoff-tribunal/gamemaker/replies/struck-lot": [],
		"standoff-tribunal/gamemaker/replies/struck-vote": [],
		"standoff-tribunal/status/holdout-owed": ["door", "lacking"],
		"standoff-tribunal/status/holdout-grace": ["accused", "until", "owed"],
		"standoff-tribunal/status/holdout-accused": ["vote", "maxVotes", "until", "owed"],
		"standoff-tribunal/status/holdout-not-voted": [],
		"standoff-tribunal/status/holdout-ballot": ["ballot"],
		"standoff-tribunal/status/holdout-voter": ["accused", "vote", "maxVotes", "until", "cast"],
		"standoff-tribunal/status/holdout-strike": ["accused"],
	},
	requires: [HoldoutPiecesService, ProgressionService, ExileService, ChannelsService, NotesService],
	uses: [IdentityService],
	// What the DM cap of `channels` asks before it refuses (old `exemptFromCap`, decision A75).
	provides: [CapExemptionService],
	tools: {
		tribunalVote: {
			description: "standoff-tribunal/tools/tribunalVote",
			params: Type.Object({ yes: Type.Boolean({ description: "true: banish the accused; false: keep it" }) }),
			for: ["resident"],
		},
		callTribunal: {
			description: "standoff-tribunal/gamemaker/tools/callTribunal",
			params: Type.Object({ accused: Accused, reason: Type.String({ description: `Your public announcement, 1-${String(MAX_NOTE_LENGTH)} characters; the city adds the procedure` }) }),
			for: ["gamemaker"],
		},
		drawLot: {
			description: "standoff-tribunal/gamemaker/tools/drawLot",
			params: Type.Object({
				candidates: Type.Array(Type.String({ description: "Resident name or ID" }), { description: "After the last vote of a tribunal failed: every resident in the city", minItems: 1, maxItems: 96 }),
			}),
			for: ["gamemaker"],
		},
		announceTribunal: {
			description: "standoff-tribunal/gamemaker/tools/announceTribunal",
			params: Type.Object({ text: Type.String({ description: `The outcome in your words, 1-${String(MAX_NOTE_LENGTH)} characters` }) }),
			for: ["gamemaker"],
		},
		permaDeath: {
			description: "standoff-tribunal/gamemaker/tools/permaDeath",
			params: Type.Object({
				agent: Type.String({ description: "The banished accused, or the resident the lot drew; name or ID" }),
				reason: Type.String({ description: `Your public line on the board, 1-${String(MAX_NOTE_LENGTH)} characters` }),
			}),
			for: ["gamemaker"],
		},
	},
});

/**
 * The context of the tribunal's hooks and handlers.
 *
 * @public
 */
export type Ctx = CtxOf<typeof standoffTribunalHead>;

/**
 * The context of the tribunal's tools.
 *
 * @public
 */
export type ToolCtx = ToolCtxOf<typeof standoffTribunalHead>;

/**
 * The read-only view of the tribunal's facts.
 *
 * @public
 */
export type View = ViewOf<typeof standoffTribunalHead>;

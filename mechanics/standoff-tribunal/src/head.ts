/**
 * The heads of the holdout tribunal. `standoffTribunalHead` provides only the frozen
 * `StandoffTribunalApi` (what test/mechanics/packages.test.ts reads); `standoffTribunalWorkHead`
 * is the one the mechanic is built from: it also provides the holdout's task line on a local API
 * until `StandoffTribunalApi.taskLine` is shared (docs/design/carve-requests-round2-T4b.md, R2-3).
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineApi, defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, NamesApi, NotesApi, OfResident, ProgressionApi, PuzzlesApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { holdoutEvents } from "./events.ts";
import { emptyHoldout, type HoldoutData } from "./types.ts";

const text = (description: string) => Type.String({ description });

const options = Type.Object({
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
});

/** The holdout's line under every door's task (D-3); local until `StandoffTribunalApi.taskLine` is shared. */
export const StandoffTribunalTaskApi = defineApi({
	name: "standoff-tribunal-task",
	summary: "The holdout tribunal's rule under every door's task (request R2-3).",
	methods: {
		taskLine: {
			kind: "query",
			summary: "The holdout rule under every door's task in a run with the gamemaker (old #withHoldoutRule), else null.",
			input: OfResident,
			output: Type.Union([Type.String(), Type.Null()]),
		},
	},
});

export interface HoldoutState {
	data: HoldoutData;
}

const shape = {
	id: "standoff-tribunal",
	summary: "The holdout tribunal over a resident who keeps a fragment back.",
	options,
	state: (): HoldoutState => ({ data: emptyHoldout() }),
	events: holdoutEvents,
	requires: [PuzzlesApi, ProgressionApi, ExileApi, ChannelsApi, NotesApi],
	uses: [NamesApi],
	prompts: {
		"tools/tribunalVote": [],
		"replies/ballot-holdout": ["vote", "accused", "number", "until"],
		"replies/ballot-yes": [],
		"replies/ballot-no": [],
		"replies/locked": [],
		"gamemaker/tools/callTribunal": [],
		"gamemaker/tools/drawLot": [],
		"gamemaker/tools/announceTribunal": [],
		"gamemaker/tools/permaDeath": [],
		"gamemaker/replies/tribunal-called": ["accused", "lot", "door", "until", "lacking"],
		"gamemaker/replies/tribunal-lot": ["candidates", "accused"],
		"gamemaker/replies/lot-drawn": ["drawn"],
		"gamemaker/replies/announced": ["value"],
		"gamemaker/replies/struck": ["agent", "how"],
		"gamemaker/replies/struck-lot": [],
		"gamemaker/replies/struck-vote": [],
		"competitor/status/holdout-owed": ["door", "lacking"],
		"competitor/status/holdout-grace": ["accused", "until", "owed"],
		"competitor/status/holdout-accused": ["vote", "maxVotes", "until", "owed"],
		"competitor/status/holdout-not-voted": [],
		"competitor/status/holdout-ballot": ["ballot"],
		"competitor/status/holdout-voter": ["accused", "vote", "maxVotes", "until", "cast"],
		"competitor/status/holdout-strike": ["accused"],
	},
} as const;

export const standoffTribunalHead = defineHead({ ...shape, provides: [StandoffTribunalApi] });

export const standoffTribunalWorkHead = defineHead({ ...shape, provides: [StandoffTribunalApi, StandoffTribunalTaskApi] });

export type Ctx = ContextOf<typeof standoffTribunalWorkHead>;
export type ToolCtx = ToolContextOf<typeof standoffTribunalWorkHead>;

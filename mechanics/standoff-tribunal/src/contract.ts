// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `standoff-tribunal`: its events in the old shape, and what the holdout tribunal asks
 * of the deal of the doors (`holdout-pieces`, provided by `puzzles`, as `progression` declares `level-pieces`). The
 * only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Ids = (description: string) => Type.Array(Id, { description });
const Int = (description: string) => Type.Integer({ description });
const By = Type.Union([Type.Literal("gamemaker"), Type.Literal("city")], { description: "Who acted: the Director, or the city at its fallback" });
const Tribunal = Int("The tribunal's number in the run, from 1");

/**
 * The events of the holdout tribunal, field for field as the old ones (old `mechanics/standoff-tribunal/src/events.ts`).
 *
 * @public
 */
export const StandoffTribunalEvents = defineEvents("standoff-tribunal", {
	blocker_found: Type.Object({ door: Int("The door"), blocker: Id, lacking: Ids("Who stands before the door without its fragment") }, { description: "The city reports a blocker" }),
	blocker_cleared: Type.Object({ door: Int("The door"), blocker: Id }, { description: "A blocker is one no more" }),
	holdout_called: Type.Object(
		{
			tribunal: Tribunal,
			accused: Id,
			door: Int("The door"),
			lacking: Ids("Who lacks the accused's fragment"),
			until: Int("The tick the grace ends"),
			text: Type.String({ description: "The announcement with the procedure" }),
			candidates: Type.Optional(Ids("The blockers the city drew the accused among")),
		},
		{ description: "A tribunal is called" },
	),
	lot_drawn: Type.Object(
		{ tribunal: Tribunal, purpose: Type.Union([Type.Literal("accused"), Type.Literal("strike")], { description: "What the lot decides" }), candidates: Ids("Who the lot is drawn among, sorted"), drawn: Id },
		{ description: "The city drew a lot" },
	),
	holdout_vote_opened: Type.Object({ tribunal: Tribunal, vote: Int("The vote's number, from 1"), voters: Ids("Who votes"), until: Int("The tick the vote closes") }, { description: "A secret vote opens" }),
	holdout_ballot: Type.Object({ tribunal: Tribunal, vote: Int("The vote's number"), agent: Id, yes: Type.Boolean({ description: "True to banish" }) }, { description: "A ballot is cast" }),
	holdout_vote_result: Type.Object(
		{ tribunal: Tribunal, vote: Int("The vote's number"), yes: Int("Yes ballots"), no: Int("Other voters"), voters: Ids("The voters still in the city"), unanimous: Type.Boolean({ description: "True when every voter said yes" }) },
		{ description: "A vote is counted" },
	),
	holdout_announced: Type.Object(
		{
			tribunal: Tribunal,
			kind: Type.Union([Type.Literal("dropped"), Type.Literal("graceFailed"), Type.Literal("voteFailed"), Type.Literal("spared")], { description: "The outcome announced" }),
			by: By,
			text: Type.String({ description: "The text on the board" }),
		},
		{ description: "An outcome is announced" },
	),
	holdout_ended: Type.Object(
		{
			tribunal: Tribunal,
			outcome: Type.Union([Type.Literal("dropped"), Type.Literal("banished"), Type.Literal("lot"), Type.Literal("spared")], { description: "How it ended" }),
			struck: Type.Optional(Id),
			by: Type.Optional(By),
		},
		{ description: "A tribunal ends" },
	),
});

const Door = Type.Integer({ minimum: 1, description: "The level of a door" });

/**
 * What the holdout tribunal reads of the deal of the doors (the old `PuzzlesApi.openFragmentDoors`, `lacking` and
 * `inherited`): the service `holdout-pieces`, provided by `puzzles`. Only `standoff-tribunal` asks; `puzzles` asks
 * it nothing.
 *
 * @public
 */
export const HoldoutPiecesService = defineService({
	name: "holdout-pieces",
	summary: "The doors of fragments open on the clock, who lacks a holder's fragment, and the fragments a resident inherited.",
	methods: {
		openFragmentDoors: {
			kind: "query",
			summary: "Every level of fragments whose door is open on the clock now, ascending (old `openFragmentDoors`).",
			input: Type.Object({}, { additionalProperties: false, description: "No input" }),
			output: Type.Array(Door, { description: "The doors" }),
		},
		lacking: {
			kind: "query",
			summary: "Who stands before the door in the holder's team without a copy of its fragment, sorted (old `lackingFragment`).",
			input: Type.Object({ level: Door, holder: Id }, { additionalProperties: false, description: "The door and the holder" }),
			output: Ids("The residents"),
		},
		inherited: {
			kind: "query",
			summary: "The fragments of struck or excluded teammates the resident holds on the level, in order (old `inheritedFragments`).",
			input: Type.Object({ resident: Id, level: Door }, { additionalProperties: false, description: "The resident and the level" }),
			output: Type.Array(Type.Object({ from: Id, fragment: Type.String({ description: "The fragment" }) }, { additionalProperties: false, description: "One fragment" }), { description: "The fragments" }),
		},
	},
});

// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `tribunal`: its events, field for field as the old platform wrote them (old `head.ts`
 * `tribunalEvents`), so a listener (the seal, a report) needs no value import of the mechanic itself. The services it
 * provides to the standoff (`ransom-price`, `trial-risk`) are declared in `@swarmtales/mechanic-standoff/contract`,
 * the one that asks. The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A04`" });
const Ids = Type.Array(Id, { description: "Resident ids" });
const Int = (description: string) => Type.Integer({ description });
const Planner = Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")], {
	description: "Who planned it: the first resident's progress, the first deadline, the gamemaker, the city's fallback, or the forced final one",
});

/**
 * The events of `tribunal`, in the old field order; declared apart so a listener writes `{ event: TribunalEvents, type: "tribunal_result" }`.
 *
 * @public
 */
export const TribunalEvents = defineEvents("tribunal", {
	tribunal_announced: Type.Object(
		{ tribunals: Type.Optional(Type.Array(Int("A tribunal's number"), { description: "Old files only" })), target: Type.Optional(Int("Residents the tribunals exile in all")), residents: Type.Optional(Int("Residents at the act's start")) },
		{ description: "The city stated the tribunal's rules with its first call" },
	),
	tribunal_scheduled: Type.Object(
		{
			tribunal: Int("The tribunal's number"),
			opens: Int("The tick it opens"),
			calledAt: Int("The tick it is called"),
			count: Int("Residents it exiles"),
			factions: Int("Factions formed before it"),
			by: Planner,
			reason: Type.Optional(Type.String({ description: "The gamemaker's reason, logged only" })),
			noDraft: Type.Optional(Type.String({ description: "Why no faction draft would be held" })),
		},
		{ description: "A tribunal was planned" },
	),
	tribunal_cancelled: Type.Object({ tribunal: Int("The tribunal's number"), reason: Type.String({ description: "Why" }) }, { description: "A planned tribunal was dropped" }),
	tribunal_called: Type.Object(
		{
			tribunal: Int("The tribunal's number"),
			opens: Int("The tick it opens"),
			count: Int("Residents it exiles"),
			factions: Int("Factions of its draft; 0 for none"),
			group: Type.Optional(Type.String({ description: "The draft's group" })),
			nominateUntil: Type.Optional(Int("The tick the nominations close")),
			noDraft: Type.Optional(Type.String({ description: "Why no faction draft is held" })),
		},
		{ description: "A tribunal was called" },
	),
	tribunal_opened: Type.Object(
		{ tribunal: Type.Optional(Int("The tribunal's number")), accused: Ids, voters: Ids, until: Int("The tick the vote closes"), count: Type.Optional(Int("Residents it exiles")) },
		{ description: "A tribunal opened: the accused are named and the present residents vote" },
	),
	faction_nominated: Type.Object({ tribunal: Int("The tribunal's number"), voter: Id, nominee: Id }, { description: "A resident nominated a leader" }),
	faction_leaders: Type.Object(
		{ tribunal: Int("The tribunal's number"), leaders: Ids, nominations: Type.Array(Type.Object({ agent: Id, count: Int("Nominations") }, { description: "One nominee" }), { description: "The nominations per nominee" }) },
		{ description: "The nominations closed and the leaders are named" },
	),
	faction_applied: Type.Object({ tribunal: Int("The tribunal's number"), agent: Id, leader: Id }, { description: "A resident applied to a faction" }),
	faction_refused: Type.Object({ tribunal: Int("The tribunal's number"), leader: Id, agent: Id }, { description: "A leader refused an applicant" }),
	factions_formed: Type.Object(
		{ tribunal: Int("The tribunal's number"), factions: Type.Array(Type.Object({ leader: Id, group: Id, members: Ids }, { description: "One faction" }), { description: "The factions" }), without: Ids },
		{ description: "The factions formed at the opening" },
	),
	bloc_result: Type.Object(
		{
			tribunal: Int("The tribunal's number"),
			leader: Id,
			voting: Ids,
			united: Type.Boolean({ description: "Whether the voting members voted as one" }),
			target: Type.Optional(Id),
			defectors: Ids,
			bonus: Int("Points for each voter"),
		},
		{ description: "How a faction voted" },
	),
	tribunal_vote: Type.Object({ voter: Id, target: Id }, { description: "A secret vote was cast" }),
	tribunal_result: Type.Object(
		{ counts: Type.Array(Type.Object({ agent: Id, votes: Int("Votes against it") }, { description: "One accused" }), { description: "The accused standing, most votes first" }), exiled: Ids, nonVoters: Ids },
		{ description: "A tribunal's vote was counted" },
	),
});

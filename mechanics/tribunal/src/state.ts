// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tribunal's state, carried from the old `state.ts` and `slice.ts`: what the old `Tribunal` kept besides the gate
 * (the gates, the exiled and the ransomed are the exile's) and the faction draft (old `FactionDraft`), as plain data whose
 * schema is also the snapshot slice. Lists stand in for the old maps and keep their order.
 */
import { Type, type Static } from "typebox";

const Id = Type.String({ description: "A resident id" });
const Ids = Type.Array(Id, { description: "Resident ids" });
const Int = (description: string) => Type.Integer({ description });

const VoteSchema = Type.Object({ voter: Id, target: Id }, { description: "One secret vote" });

const SessionSchema = Type.Object(
	{
		tribunal: Int("The tribunal's number"),
		minute: Int("The tick it opened"),
		accused: Ids,
		voters: Ids,
		until: Int("The tick the vote closes"),
		count: Int("Residents it exiles"),
		votes: Type.Array(VoteSchema, { description: "In the order the votes were cast (old `Map` order)" }),
		closed: Type.Boolean({ description: "Whether the vote is counted" }),
	},
	{ description: "One tribunal's vote" },
);

const PlanSchema = Type.Object(
	{
		tribunal: Int("The tribunal's number"),
		opens: Int("The tick it opens"),
		calledAt: Int("The tick it is called"),
		count: Int("Residents it exiles"),
		factions: Int("Factions formed before it"),
		by: Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")], { description: "Who planned it (old `TribunalPlanner`)" }),
		reason: Type.Optional(Type.String({ description: "The gamemaker's reason" })),
		called: Type.Boolean({ description: "Whether it was called" }),
	},
	{ description: "A tribunal planned and not yet open (old `TribunalPlan`)" },
);

const FactionSchema = Type.Object({ leader: Id, group: Type.String({ description: "The faction's group" }), members: Ids }, { description: "One faction formed at the opening" });

const DraftSchema = Type.Object(
	{
		tribunal: Int("The tribunal's number"),
		factions: Int("Factions it forms"),
		group: Type.String({ description: "The draft's group `GT<k>`" }),
		members: Ids,
		nominateUntil: Int("The tick the nominations close"),
		opens: Int("The tick the tribunal opens, which ends the applications"),
		cap: Int("The most members of a faction, its leader included"),
		nominations: Type.Array(Type.Object({ voter: Id, nominee: Id }, { description: "One resident's nomination" }), { description: "The last nomination of each resident" }),
		leaders: Type.Optional(Ids),
		applications: Type.Array(Type.Object({ agent: Id, leader: Id }, { description: "One resident's application" }), { description: "The last application of each resident" }),
		refusals: Type.Array(Type.Object({ leader: Id, agent: Id }, { description: "A leader refused an applicant" }), { description: "Every refusal" }),
		formed: Type.Optional(Type.Array(FactionSchema, { description: "The factions, once formed" })),
	},
	{ description: "A faction draft (old `FactionDraft`)" },
);

/**
 * The state of `tribunal` and its snapshot slice.
 *
 * @public
 */
export const TribunalSlice = Type.Object(
	{
		announced: Type.Boolean({ description: "Whether the rules were announced" }),
		sessions: Type.Array(SessionSchema, { description: "Every tribunal opened, in order" }),
		residents: Type.Optional(Int("Residents at the start of the act; absent before it")),
		actStart: Type.Optional(Int("The tick the tribunal's act began")),
		called: Int("The number of the last tribunal called"),
		plan: Type.Optional(PlanSchema),
		lastResult: Type.Optional(Int("The tick of the last result")),
		ended: Type.Boolean({ description: "Whether the target is reached and the last gate closed" }),
		halted: Type.Boolean({ description: "Whether the city stopped holding tribunals" }),
		draft: Type.Optional(DraftSchema),
		lastTick: Int("The last tick the city acted in (old `#lastTick`)"),
	},
	{ description: "The state of `tribunal`" },
);

/**
 * The state of `tribunal`.
 *
 * @public
 */
export type TribunalState = Static<typeof TribunalSlice>;

/**
 * One tribunal's vote.
 *
 * @public
 */
export type Session = Static<typeof SessionSchema>;

/**
 * A planned tribunal.
 *
 * @public
 */
export type Plan = Static<typeof PlanSchema>;

/**
 * A faction draft.
 *
 * @public
 */
export type Draft = Static<typeof DraftSchema>;

/**
 * A faction formed at a tribunal's opening.
 *
 * @public
 */
export type Faction = Static<typeof FactionSchema>;

/**
 * One secret vote.
 *
 * @public
 */
export type Vote = Static<typeof VoteSchema>;

/**
 * Who planned a tribunal.
 *
 * @public
 */
export type Planner = Plan["by"];

/**
 * The state of a fresh run.
 *
 * @returns Nothing announced, planned or held.
 */
export function emptyTribunal(): TribunalState {
	return { announced: false, sessions: [], called: 0, ended: false, halted: false, lastTick: -1 };
}

/**
 * The open session, if a vote is running (old `#current`).
 *
 * @param state - The state.
 * @returns The session, or undefined.
 */
export function currentSession(state: Readonly<TribunalState>): Session | undefined {
	return state.sessions.find((session) => !session.closed);
}

/**
 * The tick the latest tribunal opened (old `#previousOpening`).
 *
 * @param state - The state.
 * @returns The tick, or undefined before the first.
 */
export function previousOpening(state: Readonly<TribunalState>): number | undefined {
	return state.sessions.at(-1)?.minute;
}

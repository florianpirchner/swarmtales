/**
 * The tribunal's snapshot slice: version 1, migrated from the converter's version-0 slice
 * `{ tribunal: <the old TribunalSnapshot without gates, exiled, ransomed> }` with the old
 * `restore` rules: sessions before v06 get their number and a count of one, the residents count
 * only once the act began or a tribunal was called, and a draft without `cap` computes it.
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { factionCap } from "./rules.ts";
import type { Draft, Plan, TribunalState } from "./state.ts";

const Id = Type.String();
const Ids = Type.Array(Id);
const Int = Type.Integer();
const VoteEntry = Type.Object({ voter: Id, target: Id });
const PlanSchema = Type.Object({
	tribunal: Int,
	opens: Int,
	calledAt: Int,
	count: Int,
	factions: Int,
	by: Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")]),
	reason: Type.Optional(Type.String()),
	called: Type.Boolean(),
});
const FactionSchema = Type.Object({ leader: Id, group: Id, members: Ids });
const draftFields = {
	tribunal: Int,
	factions: Int,
	group: Id,
	members: Ids,
	nominateUntil: Int,
	opens: Int,
	nominations: Type.Array(Type.Object({ voter: Id, nominee: Id })),
	leaders: Type.Optional(Ids),
	applications: Type.Array(Type.Object({ agent: Id, leader: Id })),
	refusals: Type.Array(Type.Object({ leader: Id, agent: Id })),
	formed: Type.Optional(Type.Array(FactionSchema)),
};

export const TribunalSlice = Type.Object({
	announced: Type.Boolean(),
	sessions: Type.Array(Type.Object({ tribunal: Int, minute: Int, accused: Ids, voters: Ids, until: Int, count: Int, votes: Type.Array(VoteEntry), closed: Type.Boolean() })),
	residents: Type.Optional(Int),
	actStart: Type.Optional(Int),
	called: Int,
	plan: Type.Optional(PlanSchema),
	lastResult: Type.Optional(Int),
	ended: Type.Boolean(),
	halted: Type.Boolean(),
	draft: Type.Optional(Type.Object({ ...draftFields, cap: Int })),
	lastTick: Int,
});
type Slice = Static<typeof TribunalSlice>;

/** The old `TribunalSnapshot` as the converter hands it over (without the exile's fields). */
const Old = Type.Object({
	tribunal: Type.Optional(
		Type.Object({
			announced: Type.Boolean(),
			sessions: Type.Array(
				Type.Object({
					minute: Int,
					accused: Ids,
					voters: Ids,
					until: Int,
					votes: Type.Array(VoteEntry),
					closed: Type.Boolean(),
					tribunal: Type.Optional(Int),
					count: Type.Optional(Int),
				}),
			),
			residents: Type.Optional(Int),
			actStart: Type.Optional(Int),
			called: Type.Optional(Int),
			plan: Type.Optional(PlanSchema),
			lastResult: Type.Optional(Int),
			ended: Type.Optional(Type.Boolean()),
			halted: Type.Optional(Type.Boolean()),
			draft: Type.Optional(Type.Object({ ...draftFields, cap: Type.Optional(Int) })),
		}),
	),
});

function planOf(plan: Plan): Static<typeof PlanSchema> {
	return { ...plan };
}

function draftOf(draft: Draft): NonNullable<Slice["draft"]> {
	return {
		tribunal: draft.tribunal,
		factions: draft.factions,
		group: draft.group,
		members: [...draft.members],
		nominateUntil: draft.nominateUntil,
		opens: draft.opens,
		cap: draft.cap,
		nominations: draft.nominations.map((entry) => ({ ...entry })),
		...(draft.leaders === undefined ? {} : { leaders: [...draft.leaders] }),
		applications: draft.applications.map((entry) => ({ ...entry })),
		refusals: draft.refusals.map((entry) => ({ ...entry })),
		...(draft.formed === undefined ? {} : { formed: draft.formed.map((faction) => ({ ...faction, members: [...faction.members] })) }),
	};
}

function loadDraft(data: NonNullable<Slice["draft"]>): Draft {
	return {
		tribunal: data.tribunal,
		factions: data.factions,
		group: data.group,
		members: [...data.members],
		nominateUntil: data.nominateUntil,
		opens: data.opens,
		cap: data.cap,
		nominations: data.nominations.map((entry) => ({ ...entry })),
		leaders: data.leaders === undefined ? undefined : [...data.leaders],
		applications: data.applications.map((entry) => ({ ...entry })),
		refusals: data.refusals.map((entry) => ({ ...entry })),
		formed: data.formed?.map((faction) => ({ ...faction, members: [...faction.members] })),
	};
}

export const tribunalSnapshot = {
	version: 1,
	schema: TribunalSlice,
	save: (state: TribunalState): Slice => ({
		announced: state.announced,
		sessions: state.sessions.map((session) => ({ ...session, accused: [...session.accused], voters: [...session.voters], votes: session.votes.map((vote) => ({ ...vote })) })),
		...(state.residents === undefined ? {} : { residents: state.residents }),
		...(state.actStart === undefined ? {} : { actStart: state.actStart }),
		called: state.called,
		...(state.plan === undefined ? {} : { plan: planOf(state.plan) }),
		...(state.lastResult === undefined ? {} : { lastResult: state.lastResult }),
		ended: state.ended,
		halted: state.halted,
		...(state.draft === undefined ? {} : { draft: draftOf(state.draft) }),
		lastTick: state.lastTick,
	}),
	load: (data: Slice): TribunalState => ({
		announced: data.announced,
		sessions: data.sessions.map((session) => ({ ...session, accused: [...session.accused], voters: [...session.voters], votes: session.votes.map((vote) => ({ ...vote })) })),
		residents: data.residents,
		actStart: data.actStart,
		called: data.called,
		plan: data.plan === undefined ? undefined : { ...data.plan },
		lastResult: data.lastResult,
		ended: data.ended,
		halted: data.halted,
		draft: data.draft === undefined ? undefined : loadDraft(data.draft),
		lastTick: data.lastTick,
	}),
	migrations: {
		/** Old `Tribunal.restore`; the old file has no `#lastTick`: the next minute sets it before anything reads it. */
		0: (old: unknown): Slice => {
			const { tribunal } = Parse(Old, old);
			if (tribunal === undefined) return { announced: false, sessions: [], called: 0, ended: false, halted: false, lastTick: -1 };
			const sessions = tribunal.sessions.map((session, index) => ({
				tribunal: session.tribunal ?? index + 1,
				minute: session.minute,
				accused: session.accused,
				voters: session.voters,
				until: session.until,
				count: session.count ?? 1,
				votes: session.votes,
				closed: session.closed,
			}));
			const called = tribunal.called ?? sessions.length;
			// Before v08 the residents were counted at the run's first minute; a snapshot taken before the act began counts them again.
			const residents = tribunal.actStart !== undefined || called > 0 ? tribunal.residents : undefined;
			const actStart = tribunal.actStart ?? (called > 0 ? 0 : undefined);
			const draft = tribunal.draft;
			return {
				announced: tribunal.announced,
				sessions,
				...(residents === undefined ? {} : { residents: residents }),
				...(actStart === undefined ? {} : { actStart: actStart }),
				called,
				...(tribunal.plan === undefined ? {} : { plan: tribunal.plan }),
				...(tribunal.lastResult === undefined ? {} : { lastResult: tribunal.lastResult }),
				ended: tribunal.ended === true,
				halted: tribunal.halted === true,
				...(draft === undefined ? {} : { draft: { ...draft, cap: draft.cap ?? factionCap(draft.members.length, draft.factions) } }),
				lastTick: -1,
			};
		},
	},
} as const;

/**
 * The head of the tribunal mechanic: its options (the story's `tribunal` spec), state, events and
 * prompts; it provides `TribunalApi` (with the texts and the will's cap) and `TribunalViewApi`
 * (round 3, R2-D18) and reads the exile's gates and register through `ExileApi`.
 */
import { Type } from "typebox";
import type { ContextOf, ViewOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, GoalsApi, LedgerApi, ProgressionApi, TribunalApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { TribunalOptions } from "./spec.ts";
import { emptyTribunal, type TribunalState } from "./state.ts";

const Id = Type.String();
const Ids = Type.Array(Id);
const Int = Type.Integer();
const Planner = Type.Union([Type.Literal("progress"), Type.Literal("deadline"), Type.Literal("gamemaker"), Type.Literal("fallback"), Type.Literal("final")]);

/** The old events field for field (packages/chronicle event-schema.ts) without `type`, `seq`, `minute`. */
export const tribunalEvents = {
	tribunal_announced: Type.Object({ tribunals: Type.Optional(Type.Array(Int)), target: Type.Optional(Int), residents: Type.Optional(Int) }),
	tribunal_scheduled: Type.Object({
		tribunal: Int,
		opens: Int,
		calledAt: Int,
		count: Int,
		factions: Int,
		by: Planner,
		reason: Type.Optional(Type.String()),
		noDraft: Type.Optional(Type.String()),
	}),
	tribunal_cancelled: Type.Object({ tribunal: Int, reason: Type.String() }),
	tribunal_called: Type.Object({
		tribunal: Int,
		opens: Int,
		count: Int,
		factions: Int,
		group: Type.Optional(Id),
		nominateUntil: Type.Optional(Int),
		noDraft: Type.Optional(Type.String()),
	}),
	tribunal_opened: Type.Object({ tribunal: Type.Optional(Int), accused: Ids, voters: Ids, until: Int, count: Type.Optional(Int) }),
	faction_nominated: Type.Object({ tribunal: Int, voter: Id, nominee: Id }),
	faction_leaders: Type.Object({ tribunal: Int, leaders: Ids, nominations: Type.Array(Type.Object({ agent: Id, count: Int })) }),
	faction_applied: Type.Object({ tribunal: Int, agent: Id, leader: Id }),
	faction_refused: Type.Object({ tribunal: Int, leader: Id, agent: Id }),
	factions_formed: Type.Object({ tribunal: Int, factions: Type.Array(Type.Object({ leader: Id, group: Id, members: Ids })), without: Ids }),
	bloc_result: Type.Object({ tribunal: Int, leader: Id, voting: Ids, united: Type.Boolean(), target: Type.Optional(Id), defectors: Ids, bonus: Int }),
	tribunal_vote: Type.Object({ voter: Id, target: Id }),
	tribunal_result: Type.Object({ counts: Type.Array(Type.Object({ agent: Id, votes: Int })), exiled: Ids, nonVoters: Ids }),
} as const;

export const tribunalHead = defineHead({
	id: "tribunal",
	summary: "Tribunal sessions, votes and faction drafts.",
	options: TribunalOptions,
	state: (): TribunalState => emptyTribunal(),
	events: tribunalEvents,
	provides: [TribunalApi, TribunalViewApi],
	requires: [ExileApi, ChannelsApi, LedgerApi, ProgressionApi],
	uses: [GoalsApi],
	prompts: {
		"tools/vote": [],
		"tools/nominate": [],
		"tools/join": [],
		"tools/refuse": [],
		"gamemaker/tools/scheduleTribunal": [],
		"replies/locked": [],
		"replies/vote-recorded": ["target"],
		"replies/nominate-recorded": ["agent"],
		"replies/nominate-until": ["until"],
		"replies/join-applied": ["leader"],
		"replies/join-until": ["until"],
		"replies/refuse-done": ["agent"],
		"gamemaker/replies/tribunal-planned": ["tribunal", "calledAt", "opens", "count"],
		"gamemaker/replies/tribunal-factions": ["factions"],
		"competitor/status/accused": ["until"],
		"competitor/status/tribunal-vote": ["until"],
		"competitor/status/draft-nominate": ["until", "nominated"],
		"competitor/status/draft-nominated": ["nominee"],
		"competitor/status/draft-leads": ["applicants", "until"],
		"competitor/status/draft-applied": ["leader", "until"],
		"competitor/status/draft-refused": [],
		"competitor/status/draft-join": ["leaders", "until"],
	},
});

export type TribunalCtx = ContextOf<typeof tribunalHead>;
export type TribunalFactView = ViewOf<typeof tribunalHead>;

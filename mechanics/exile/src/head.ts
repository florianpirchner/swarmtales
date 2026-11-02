/**
 * The head of the exile mechanic: its state, events and prompts; it provides `ExileApi` (with the
 * gates, the exiled and the ransomed, round 3 R2-D18) and uses the seal, the goals and the tribunal
 * (its texts, the will's cap and the ransom prices of an old gate).
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, ExileEvents, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi, StandoffApi, TribunalApi } from "@swarmtales/mechanic-shared";
import { emptyExile, type ExileState } from "./state.ts";

const Id = Type.String();
const Ids = Type.Array(Id);
const Int = Type.Integer();

/** The old events field for field (packages/chronicle event-schema.ts) without `type`, `seq`, `minute`; keys in the order the old code built them. */
export const exileEvents = {
	...ExileEvents.events,
	exile_gate: Type.Object({ agent: Id, until: Int, ransomable: Type.Boolean(), voters: Ids, price: Int, selfPrice: Int }),
	ransom_paid: Type.Object({ payer: Id, target: Id, amount: Int, paid: Int, price: Int, selfPrice: Int, covered: Int }),
	ransomed: Type.Object({ agent: Id, payers: Ids }),
	last_will: Type.Object({
		agent: Id,
		text: Type.String(),
		bequests: Type.Array(Type.Union([Type.Object({ to: Id, points: Int }), Type.Object({ to: Id, factor: Type.String() })])),
	}),
} as const;

export const exileHead = defineHead({
	id: "exile",
	summary: "The gate, ransom, last will and exile.",
	options: Type.Object({}),
	state: (): ExileState => emptyExile(),
	events: exileEvents,
	provides: [ExileApi],
	requires: [ProgressionApi, ChannelsApi, LedgerApi, StandoffApi, PuzzlesApi],
	uses: [SealApi, GoalsApi, TribunalApi],
	prompts: {
		"tools/payRansom": [],
		"tools/lastWill": [],
		"replies/locked": [],
		"replies/ransom-covered": ["paid", "target"],
		"replies/ransom-paid": ["covered", "target", "price", "selfPrice"],
		"replies/will-invalid": [],
		"replies/will-written": [],
		"competitor/status/gate": ["until"],
		"exile/status-exiled": [],
		"exile/ransom-toward": ["payer", "amount", "covered"],
		"exile/will-points": ["agent", "points"],
		"exile/will-piece": ["agent", "label", "value"],
	},
});

export type ExileCtx = ContextOf<typeof exileHead>;

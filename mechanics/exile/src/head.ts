/**
 * The heads of the exile mechanic. `exileHead` keeps the shape the wave 3.0 plan froze (what
 * test/mechanics/packages.test.ts reads); `exileWorkHead` is the one the mechanic is built from:
 * its state, events and prompts, and the local adapters `exile-extras` (provided) and
 * `tribunal-extras`, `tribunal` (used; docs/design/carve-requests-round2-T4a.md, the same pattern
 * as goals' extras in round 1).
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, ExileEvents, GoalsApi, LedgerApi, ProgressionApi, PuzzlesApi, SealApi, StandoffApi, TribunalApi } from "@swarmtales/mechanic-shared";
import { ExileExtrasApi, TribunalExtrasApi } from "./extras.ts";
import { emptyExile, type ExileState } from "./state.ts";

export const exileHead = defineHead({
	id: "exile",
	summary: "The gate, ransom, last will and exile.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...ExileEvents.events },
	provides: [ExileApi],
	requires: [ProgressionApi, ChannelsApi, LedgerApi, StandoffApi, PuzzlesApi],
	uses: [SealApi, GoalsApi],
});

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

export const exileWorkHead = defineHead({
	id: "exile",
	summary: exileHead.summary,
	options: Type.Object({}),
	state: (): ExileState => emptyExile(),
	events: exileEvents,
	provides: [ExileApi, ExileExtrasApi],
	requires: [ProgressionApi, ChannelsApi, LedgerApi, StandoffApi, PuzzlesApi],
	uses: [SealApi, GoalsApi, TribunalExtrasApi, TribunalApi],
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

export type ExileCtx = ContextOf<typeof exileWorkHead>;

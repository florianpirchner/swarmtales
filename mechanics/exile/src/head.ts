// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `exile` mechanic: its state with the snapshot, its events, services, prompts and tools. */
import { Type, type Static } from "typebox";
import { IdentityService, NoticesService } from "@swarmtales/mechanic-contracts";
import { defineHead, inSchemaOrder, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { ExileEvents, ExilePurseService, ExileService, ToGate } from "./contract.ts";
import { exileMetrics } from "./metrics.ts";

const Id = Type.String({ description: "A resident id" });
const Factors = Type.Array(Type.String({ description: "A piece id" }), { description: "The pieces a will left to heirs" });

const Gate = Type.Object(
	{
		resident: Id,
		since: Type.Integer({ description: "The tick the gate opened" }),
		until: ToGate.properties.until,
		ransomable: ToGate.properties.ransomable,
		voters: ToGate.properties.voters,
		price: ToGate.properties.price,
		selfPrice: ToGate.properties.selfPrice,
		bequestPerHeir: ToGate.properties.bequestPerHeir,
		texts: ToGate.properties.texts,
		by: Type.String({ description: "Who exiles when the gate closes" }),
		payments: Type.Array(Type.Object({ payer: Id, amount: Type.Integer({ description: "The points paid" }) }, { description: "One payment" }), { description: "The payments toward the ransom, in order" }),
		will: Type.Optional(Type.Object({ text: Type.String({ description: "The public text" }), factors: Factors }, { description: "The will, once written" })),
	},
	{ description: "One open gate" },
);

const ExileSlice = Type.Object(
	{
		gates: Type.Array(Gate, { description: "The open gates, in the order opened" }),
		gone: Type.Array(Type.Object({ resident: Id, by: Type.String({ description: "Who banished it" }), tick: Type.Integer({ description: "The tick it left" }), bequeathed: Factors }, { description: "One banished resident" }), {
			description: "The banished residents, in the order they were banished",
		}),
		ransomed: Type.Array(Id, { description: "The residents bought back once" }),
	},
	{ description: "The state of `exile`" },
);

/**
 * One open gate in the state of `exile`.
 *
 * @public
 */
export type GateState = Static<typeof Gate>;

/**
 * The state of `exile`.
 *
 * @public
 */
export type ExileState = Static<typeof ExileSlice>;

const PayRansomParams = Type.Object({
	target: Type.String({ description: "The resident at the gate, by name or ID, e.g. A03" }),
	amount: Type.Integer({ description: "Positive integer; more than the rest of the price is not taken", minimum: 1 }),
});

const LastWillParams = Type.Object({
	text: Type.String({ description: "The public text of your will", maxLength: 600 }),
	bequests: Type.Array(
		Type.Object({
			to: Type.String({ description: "Heir, by name or ID, e.g. A02" }),
			points: Type.Optional(Type.Integer({ description: "Points to leave (0 or omitted: none)", minimum: 0 })),
			factor: Type.Optional(Type.String({ description: "A piece you hold, e.g. L8-counter-A02" })),
		}),
	),
});

/**
 * The head of `exile`: everything that can be read without running a handler.
 *
 * @public
 */
export const exileHead = defineHead({
	id: "exile",
	package: "@swarmtales/mechanic-exile",
	summary: "Banishing a resident: the gate, the ransom, the last will, one event and one suspension.",
	state: ExileSlice,
	start: (): ExileState => ({ gates: [], gone: [], ransomed: [] }),
	snapshot: {
		save: (state: ExileState): ExileState => structuredClone(state),
		// A snapshot file sorts the keys: the state comes back in the order of its schema (A43).
		load: (data): ExileState => inSchemaOrder(ExileSlice, data),
	},
	events: ExileEvents.events,
	metrics: exileMetrics(),
	provides: [ExileService],
	// The points a ransom burns and a will moves; a name in place of an id; the city's posts and notices. All optional.
	uses: [ExilePurseService, IdentityService, NoticesService],
	prompts: {
		"exile/tools/payRansom": [],
		"exile/tools/lastWill": [],
		"exile/replies/locked": [],
		"exile/replies/ransom-covered": ["paid", "target"],
		"exile/replies/ransom-paid": ["covered", "target", "price", "selfPrice"],
		"exile/replies/will-invalid": [],
		"exile/replies/will-written": [],
		"exile/status/gate": ["until"],
		"exile/status-exiled": [],
		"exile/ransom-toward": ["payer", "amount", "covered"],
		"exile/will-points": ["agent", "points"],
	},
	tools: {
		payRansom: { description: "exile/tools/payRansom", params: PayRansomParams, for: ["resident"] },
		lastWill: { description: "exile/tools/lastWill", params: LastWillParams, for: ["resident"] },
	},
});

/**
 * The context of the hooks and services of `exile`.
 *
 * @public
 */
export type ExileCtx = CtxOf<typeof exileHead>;

/**
 * The context of the tools of `exile`.
 *
 * @public
 */
export type ExileToolCtx = ToolCtxOf<typeof exileHead>;

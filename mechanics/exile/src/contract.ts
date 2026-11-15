// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service contract of the mechanic `exile`: the only file another mechanic imports. It holds the service
 * `exile`, the events (`exiled`, the gate, the ransom, the last will), the reason of the suspension, and the service
 * `exile-purse` that `exile` asks for the points a ransom or a will spends, so a listener (the ledger, the pieces), a
 * caller (a court, a tribunal, a seal) and the keeper of the points need no value import of the mechanic itself.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const none = Type.Object({}, { additionalProperties: false, description: "No input" });
const id = Type.String({ description: "A resident id, for example `A01`" });
const ids = Type.Array(id, { description: "Resident ids" });
const ofResident = Type.Object({ resident: id }, { additionalProperties: false, description: "The resident that is asked about" });

/**
 * The reason of the suspension that `exile` holds on a banished resident (the kernel's `actor_suspended`).
 *
 * @public
 */
export const EXILE_SUSPENSION = "exiled";

/**
 * The `by` of a strike that leaves the resident's points and pieces where they are (the holdout trial of Whispers:
 * "you keep your points, but you take no more turns"); see {@link clearsAway}.
 *
 * @public
 */
export const KEEPING_STRIKE = "holdout";

/**
 * The payload of the event `exiled`, in the old field order: `will` when the gate closed on a resident that left one,
 * `by` when a caller banished it (`seal`, `holdout`, a court); a gate that closes writes neither.
 *
 * @public
 */
export const Exiled = Type.Object(
	{
		agent: Type.String({ description: "The resident that was banished" }),
		will: Type.Optional(Type.String({ description: "The text of its last will, when the gate closed on one" })),
		by: Type.Optional(Type.String({ description: "Who banished it: the `by` of the call of `banish`, or the id of the calling plugin when the call gives none" })),
	},
	{ additionalProperties: false, description: "A resident was banished; it is suspended from now on" },
);

/**
 * The static shape of the payload of `exiled`.
 *
 * @public
 */
export type Exiled = Static<typeof Exiled>;

/**
 * Whether the owners of a banished resident's points and pieces clear them away: true for every exile but a
 * {@link KEEPING_STRIKE} (old `#onStruck`: no burn, nothing kept, nothing contracted).
 *
 * @param exiled - The payload of `exiled`.
 * @returns False only for a strike that keeps.
 *
 * @public
 */
export function clearsAway(exiled: Exiled): boolean {
	return exiled.by !== KEEPING_STRIKE;
}

const Bequest = Type.Union([Type.Object({ to: id, points: Type.Integer({ description: "The points" }) }, { description: "Points to an heir" }), Type.Object({ to: id, factor: Type.String({ description: "The id of a piece" }) }, { description: "A piece to an heir" })], { description: "One bequest" });

/**
 * The events of `exile`, field for field as the old platform wrote them; declared apart so a listener writes
 * `{ event: ExileEvents, type: "exiled" }`.
 *
 * @public
 */
export const ExileEvents = defineEvents("exile", {
	exiled: Exiled,
	exile_gate: Type.Object(
		{ agent: Type.String({ description: "The resident at the gate" }), until: Type.Integer({ description: "The tick at whose start the gate closes" }), ransomable: Type.Boolean({ description: "Whether a ransom is taken" }), voters: Type.Array(id, { description: "Who voted the resident out" }), price: Type.Integer({ description: "What others pay in full" }), selfPrice: Type.Integer({ description: "What the resident pays in full for itself" }) },
		{ description: "A resident went to the gate" },
	),
	ransom_paid: Type.Object(
		{ payer: Type.String({ description: "Who paid" }), target: Type.String({ description: "The resident at the gate" }), amount: Type.Integer({ description: "The points spent by this payment" }), paid: Type.Integer({ description: "The points paid toward this gate so far" }), price: Type.Integer({ description: "What others pay in full" }), selfPrice: Type.Integer({ description: "What the resident pays in full for itself" }), covered: Type.Integer({ description: "The share of the ransom covered, in percent" }) },
		{ description: "Points were paid toward a ransom" },
	),
	ransomed: Type.Object({ agent: Type.String({ description: "The resident that returns" }), payers: Type.Array(id, { description: "Who paid toward the ransom, sorted" }) }, { description: "A ransom was paid in full: the resident returns" }),
	last_will: Type.Object({ agent: Type.String({ description: "The resident at the gate" }), text: Type.String({ description: "The public text, trimmed" }), bequests: Type.Array(Bequest, { description: "The bequests in the order written, an entry with points and a piece as two" }) }, { description: "A resident at the gate left its will" }),
});

/**
 * The answer of `banish`: `ok: true` when the resident was banished by this call, else `ok: false` with the code.
 *
 * @public
 */
export const BanishResult = Type.Object(
	{
		ok: Type.Boolean({ description: "True when this call banished the resident" }),
		code: Type.Optional(
			Type.Union([Type.Literal("UNKNOWN_RESIDENT", { description: "The id is no resident of the run" }), Type.Literal("ALREADY_EXILED", { description: "The resident was banished before" })], {
				description: "Why nothing happened; absent when `ok` is true",
			}),
		),
	},
	{ additionalProperties: false, description: "What a call of `banish` did" },
);

/**
 * The static shape of the answer of `banish`.
 *
 * @public
 */
export type BanishResult = Static<typeof BanishResult>;

/**
 * Where a resident stands (old `Standing`).
 *
 * @public
 */
export const Standing = Type.Union(
	[
		Type.Object({ kind: Type.Literal("alive", { description: "In the city" }) }, { description: "In the city" }),
		Type.Object({ kind: Type.Literal("gate", { description: "At the gate" }), until: Type.Integer({ description: "The tick the gate closes" }) }, { description: "At the gate until a tick" }),
		Type.Object({ kind: Type.Literal("exiled", { description: "Gone" }) }, { description: "Gone" }),
	],
	{ description: "Where a resident stands" },
);

/**
 * One gate as a caller and the gamemaker see it (old `GateView`).
 *
 * @public
 */
export const GateView = Type.Object(
	{ agent: id, since: Type.Integer({ description: "The tick it opened" }), until: Type.Integer({ description: "The tick it closes" }), ransomable: Type.Boolean({ description: "Whether a ransom is taken" }), price: Type.Integer({ description: "What others pay in full" }), selfPrice: Type.Integer({ description: "What the resident pays in full" }), paid: Type.Integer({ description: "The points paid so far" }), covered: Type.Integer({ description: "The share covered, in percent" }), willDone: Type.Boolean({ description: "Whether the will is written" }) },
	{ additionalProperties: false, description: "One open gate" },
);

/**
 * What a caller passes to open a gate: the prices and the texts are the caller's, not the exile's (12-m5-spec.md 2.3).
 *
 * @public
 */
export const ToGate = Type.Object(
	{
		resident: id,
		until: Type.Integer({ description: "The tick at whose start the gate closes" }),
		ransomable: Type.Boolean({ description: "False: the resident was bought back once and no ransom is taken" }),
		voters: ids,
		price: Type.Integer({ description: "What others pay in full" }),
		selfPrice: Type.Integer({ description: "What the resident pays in full for itself" }),
		bequestPerHeir: Type.Number({ description: "The share of its points the will may leave each heir, in [0, 1]" }),
		notice: Type.String({ description: "The notice the resident gets at the gate, rendered" }),
		texts: Type.Object(
			{
				exiled: Type.String({ description: "The board's post when the gate closes; `{exiled}` is the resident" }),
				will: Type.String({ description: "The board's post of the will's text; `{exiled}` and `{will}`" }),
				ransomed: Type.String({ description: "The board's post when the ransom is paid; `{payers}` and `{exiled}`" }),
			},
			{ additionalProperties: false, description: "The board's texts of this gate; other braces are left as the caller wrote them" },
		),
		by: Type.Optional(Type.String({ description: "Who exiles when the gate closes (`exiledBy`); the id of the calling plugin when left out" })),
	},
	{ additionalProperties: false, description: "A gate to open" },
);

/**
 * The contract of the service `exile`: banish a resident, open a gate, and ask who stands where.
 *
 * @example
 * ```ts
 * const done = ctx.call(ExileService, "banish", { resident: "A04" });
 * if (!done.ok) return refuse(done.code ?? "REFUSED");
 * ```
 *
 * @public
 */
export const ExileService = defineService({
	name: "exile",
	summary: "Banishes residents, keeps the gate, and says who stands where.",
	methods: {
		banish: {
			kind: "command",
			summary: "Banishes a resident at once (also from the gate, whose will then stands): writes `exiled` with `by`, then suspends it with the reason `exiled`. Writes nothing when the resident is unknown or banished already.",
			input: Type.Object({ resident: id, by: Type.Optional(Type.String({ description: "Who banishes, for the event; the id of the calling plugin when left out" })) }, { additionalProperties: false, description: "The resident to banish" }),
			output: BanishResult,
		},
		toGate: { kind: "command", summary: "Sends a resident to the gate (old `toGate`): notifies it, then writes `exile_gate`; the gate closes at `until` unless a ransom is paid first.", input: ToGate, output: Type.Null({ description: "Nothing" }) },
		isExiled: { kind: "query", summary: "Says whether the resident is banished.", input: ofResident, output: Type.Boolean({ description: "True for a banished resident; false for any other id" }) },
		exiled: { kind: "query", summary: "Every banished resident in the order they were banished, but those of a strike that keeps (old `Tribunal#exiled`).", input: none, output: ids },
		standing: { kind: "query", summary: "Where the resident stands (old `standingOf`).", input: ofResident, output: Standing },
		alive: { kind: "query", summary: "Every resident not banished, in the game's order.", input: none, output: ids },
		exiledBy: { kind: "query", summary: "Who banished the resident, or null while it is not banished.", input: ofResident, output: Type.Union([Type.String({ description: "The `by`" }), Type.Null({ description: "Not banished" })], { description: "Who banished it" }) },
		gates: { kind: "query", summary: "Every open gate, in the order opened.", input: none, output: Type.Array(GateView, { description: "The gates" }) },
		ransomed: { kind: "query", summary: "Whether the resident was bought back from the gate once.", input: ofResident, output: Type.Boolean({ description: "True once bought back" }) },
		bequeathed: { kind: "query", summary: "The pieces the banished resident's will left to heirs: its owner keeps and burns none of them.", input: ofResident, output: Type.Array(Type.String({ description: "A piece id" }), { description: "The pieces" }) },
	},
});

const account = Type.String({ description: "The account, a resident id" });
const booking = { amount: Type.Integer({ description: "The points" }), reason: Type.String({ description: "Why, for the booking" }) };

/**
 * What `exile` asks the keeper of the points (the ledger) when a ransom or a will spends them. Without a provider a
 * resident holds no points, so a ransom and a will of points are refused with `INSUFFICIENT_FUNDS`.
 *
 * @public
 */
export const ExilePurseService = defineService({
	name: "exile-purse",
	summary: "The points a ransom burns and a will moves.",
	methods: {
		balance: { kind: "query", summary: "The points of the account.", input: Type.Object({ account }, { additionalProperties: false, description: "The account" }), output: Type.Number({ description: "Its points" }) },
		burn: { kind: "command", summary: "Burns points of the account.", input: Type.Object({ account, ...booking }, { additionalProperties: false, description: "The burn" }), output: Type.Null({ description: "Nothing" }) },
		move: { kind: "command", summary: "Moves points the account holds to another.", input: Type.Object({ from: account, to: account, ...booking }, { additionalProperties: false, description: "The move" }), output: Type.Null({ description: "Nothing" }) },
	},
});

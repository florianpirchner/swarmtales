// SPDX-License-Identifier: Apache-2.0
/**
 * The service contract of the mechanic `exile`: the only file another mechanic imports. It holds the service
 * `exile`, the one event `exiled` and the reason of the suspension, so a listener (the ledger, the pieces) and a
 * caller (a court) need no value import of the mechanic itself.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const none = Type.Object({}, { additionalProperties: false, description: "No input" });
const resident = Type.String({ description: "A resident id, for example `A01`" });

/**
 * The reason of the suspension that `exile` holds on a banished resident (the kernel's `actor_suspended`).
 *
 * @public
 */
export const EXILE_SUSPENSION = "exiled";

/**
 * The payload of the event `exiled`. `agent` is the old field name, kept so a log reads as before; `by` is new.
 *
 * @public
 */
export const Exiled = Type.Object(
	{
		agent: Type.String({ description: "The resident that was banished" }),
		by: Type.String({ description: "Who banished it: the `by` of the call, or the id of the calling plugin when the call names none" }),
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
 * The events of `exile`, declared apart so a listener writes `{ event: ExileEvents, type: "exiled" }`.
 *
 * @public
 */
export const ExileEvents = defineEvents("exile", { exiled: Exiled });

/**
 * The answer of `banish`: `ok: true` when the resident was banished by this call, else `ok: false` with the code.
 *
 * @public
 */
export const BanishResult = Type.Object(
	{
		ok: Type.Boolean({ description: "True when this call banished the resident" }),
		code: Type.Optional(
			Type.Union([Type.Literal("UNKNOWN_RESIDENT", { description: "The id names no resident of the run" }), Type.Literal("ALREADY_EXILED", { description: "The resident was banished before" })], {
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
 * The contract of the service `exile`: banish a resident, and ask who is banished.
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
	summary: "Banishes residents and says who is banished.",
	methods: {
		banish: {
			kind: "command",
			summary: "Banishes a resident: writes `exiled`, then suspends it with the reason `exiled`. Writes nothing when the resident is unknown or banished already.",
			input: Type.Object({ resident, by: Type.Optional(Type.String({ description: "Who banishes, for the event; the id of the calling plugin when left out" })) }, { additionalProperties: false, description: "The resident to banish" }),
			output: BanishResult,
		},
		isExiled: { kind: "query", summary: "Says whether the resident is banished.", input: Type.Object({ resident }, { additionalProperties: false, description: "The resident that is asked about" }), output: Type.Boolean({ description: "True for a banished resident; false for any other id" }) },
		exiled: { kind: "query", summary: "Every banished resident, in the order they were banished.", input: none, output: Type.Array(resident, { description: "The banished residents" }) },
	},
});

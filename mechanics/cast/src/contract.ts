// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `cast`: its events and the service `cast` (old `CastApi` with `CastEvents`). The
 * script reveals, retires and pays the figures and runs their collections through it; `receipts` listens to
 * `escrow_paid` for the receipt of an escrow payment. The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id or the id of a cast member" });
const Cast = Type.String({ description: "The id of a cast member, for example `STEWARD`" });
const Into = Type.String({ description: "The name of a collection" });
const Ids = Type.Array(Into, { description: "Names of collections" });
const Changed = Type.Boolean({ description: "True when the call changed something" });
const Nothing = Type.Null({ description: "Nothing" });
const Done = Type.Union(
	[
		Type.Object({ ok: Type.Literal(true, { description: "Done" }) }, { description: "Done" }),
		Type.Object({ ok: Type.Literal(false, { description: "Refused" }), code: Type.String({ description: "The code" }), detail: Type.Optional(Type.String({ description: "Why" })) }, { description: "Refused" }),
	],
	{ description: "Done, or why not" },
);
const SolveEnd = Type.Object(
	{ level: Type.Integer({ description: "The level" }), minutes: Type.Integer({ description: "The ticks after its first solve" }) },
	{ description: "The window also ends this many ticks after the first solve of the level" },
);
const audit = (mark: string) => Type.Literal(mark, { description: "The audit mark" });

/**
 * The events of the cast, in the old field order; `escrow_paid` is new (the old cast issued the receipt itself).
 *
 * @public
 */
export const CastEvents = defineEvents("cast", {
	cast_level_set: Type.Object({ cast: Cast, level: Type.Integer({ description: "The public level" }), audit: audit("NPC_LEVEL_SET") }, { description: "The script set a member's public level" }),
	cast_revealed: Type.Object({ cast: Cast }, { description: "A hidden member became visible" }),
	cast_retired: Type.Object({ cast: Cast }, { description: "A member is gone for good" }),
	cast_dm: Type.Object(
		{ from: Id, cast: Cast, text: Type.String({ description: "The text, trimmed" }), collections: Ids, number: Type.Optional(Type.Integer({ description: "The city's message number" })) },
		{ description: "A resident's direct message to a member, and the collections it went into" },
	),
	cast_collected: Type.Object({ from: Id, cast: Cast, into: Ids }, { description: "`from` is a new sender in the collections `into`, after the message's marks were spent" }),
	collection_started: Type.Object(
		{ into: Into, cast: Cast, first: Type.Integer({ description: "How many entries it takes" }), untilMinute: Type.Integer({ description: "The tick it ends" }) },
		{ description: "A collection of direct messages to a member began" },
	),
	collection_shortened: Type.Object({ into: Into, untilMinute: Type.Integer({ description: "The new end" }) }, { description: "A collection ends earlier" }),
	collection_revealed: Type.Object(
		{ into: Into, cast: Cast, entries: Type.Integer({ description: "Its entries" }), postSeq: Type.Integer({ description: "The board post" }), audit: audit("DIRECTOR_PRIVACY_BREACH") },
		{ description: "A collection was posted on the board as its member" },
	),
	lottery_drawn: Type.Object({ into: Into, candidates: Type.Array(Id, { description: "The distinct senders, sorted" }), winner: Id }, { description: "A lottery among a collection's senders" }),
	escrow_paid: Type.Object(
		{ cast: Cast, to: Id, amount: Type.Number({ description: "The points" }), txId: Type.String({ description: "The ledger's booking" }) },
		{ description: "A member paid a resident from its escrow; written after the booking" },
	),
});

/**
 * What the script reads of and does with the cast (old `CastApi`), and what routes a direct message to a member.
 *
 * @public
 */
export const CastService = defineService({
	name: "cast",
	summary: "The cast: figures, their escrow, collections and lotteries.",
	methods: {
		isActive: { kind: "query", summary: "Whether a resident may write to this cast member now (old `cast.isActive`).", input: Type.Object({ cast: Cast }, { description: "The member" }), output: Type.Boolean({ description: "True when active" }) },
		collection: {
			kind: "query",
			summary: "A collection by name as the old script read it: how many entries it takes, its end and its entries; null when none was started.",
			input: Type.Object({ into: Into }, { description: "The collection" }),
			output: Type.Union(
				[
					Type.Object({ first: Type.Integer({ description: "How many entries it takes" }), untilMinute: Type.Integer({ description: "The tick it ends" }), entries: Type.Integer({ description: "The entries it holds" }) }, { description: "The collection" }),
					Type.Null({ description: "Not started" }),
				],
				{ description: "The collection, or null" },
			),
		},
		receive: {
			kind: "command",
			summary: "A resident's direct message to a cast member (old `#dmToCast` after the checks): collected while a collection runs; writes `cast_dm` with the number the router took.",
			input: Type.Object({ from: Id, cast: Cast, text: Type.String({ description: "The text, trimmed" }), number: Type.Integer({ description: "The city's message number" }) }, { description: "The message" }),
			output: Type.Object({ collections: Ids, newSender: Ids }, { description: "Where it was collected, and where its sender is new" }),
		},
		collected: { kind: "command", summary: "The message's marks were spent: writes `cast_collected` for the `newSender` of `receive`.", input: Type.Object({ from: Id, cast: Cast, into: Ids }, { description: "The sender and the collections" }), output: Nothing },
		setLevel: { kind: "command", summary: "Old `setCastLevel`; writes `cast_level_set`.", input: Type.Object({ cast: Cast, level: Type.Integer({ description: "The public level" }) }, { description: "The level" }), output: Nothing },
		reveal: { kind: "command", summary: "Old `revealCast`; writes `cast_revealed`.", input: Type.Object({ cast: Cast }, { description: "The member" }), output: Changed },
		retire: { kind: "command", summary: "Old `retireCast`; writes `cast_retired`.", input: Type.Object({ cast: Cast }, { description: "The member" }), output: Changed },
		escrow: {
			kind: "command",
			summary: "Pays a resident from the cast member's escrow (old `escrowTransfer`); writes `escrow_paid` after the booking.",
			input: Type.Object({ cast: Cast, to: Id, amount: Type.Number({ exclusiveMinimum: 0, description: "The points" }) }, { description: "The payment" }),
			output: Done,
		},
		startCollection: {
			kind: "command",
			summary: "Old `startCollection`; writes `collection_started`.",
			input: Type.Object(
				{ into: Into, cast: Cast, first: Type.Integer({ description: "How many entries it takes" }), untilMinute: Type.Integer({ description: "The tick it ends" }), distinctSenders: Type.Boolean({ description: "One entry per sender" }), afterSolve: Type.Optional(SolveEnd) },
				{ description: "The collection" },
			),
			output: Changed,
		},
		shortenCollection: { kind: "command", summary: "Old `shortenCollection`; writes `collection_shortened`.", input: Type.Object({ into: Into, untilMinute: Type.Integer({ description: "The new end" }) }, { description: "The end" }), output: Nothing },
		revealCollection: { kind: "command", summary: "Old `revealCollection`; writes `collection_revealed`.", input: Type.Object({ into: Into, header: Type.Optional(Type.String({ description: "A first line" })) }, { description: "The collection" }), output: Done },
		drawLottery: {
			kind: "command",
			summary: "Old `drawLottery` (stream `lottery`, into, salt, tick); writes `lottery_drawn`.",
			input: Type.Object({ into: Into, salt: Type.String({ description: "The salt, the rule's id" }) }, { description: "The lottery" }),
			output: Type.Union([Id, Type.Null({ description: "No sender" })], { description: "The winner, or null" }),
		},
	},
});

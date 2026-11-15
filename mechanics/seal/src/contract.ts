// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `seal`: its events, field for field as the old platform wrote them (old `events.ts`
 * `sealEvents`), so a listener (a report, the metrics) needs no value import of the mechanic itself. The only file
 * another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A04`" });
const Seal = Type.Integer({ description: "The seal's number in its act, from 1" });

/**
 * The events of `seal`, in the old field order; declared apart so a listener writes `{ event: SealEvents, type: "seal_used" }`.
 *
 * @public
 */
export const SealEvents = defineEvents("seal", {
	seal_auction_opened: Type.Object({ seal: Seal, until: Type.Integer({ description: "The tick the bidding closes" }) }, { description: "The city opened the auction of a seal" }),
	seal_bid: Type.Object({ seal: Seal, agent: Id, points: Type.Integer({ description: "The bid; 0 withdraws" }) }, { description: "A resident bid in secret; its last bid counts" }),
	seal_won: Type.Object(
		{
			seal: Seal,
			agent: Id,
			bid: Type.Integer({ description: "What the winner paid" }),
			bids: Type.Array(Type.Object({ agent: Id, points: Type.Integer({ description: "What it paid" }) }, { description: "One bidder" }), { description: "Every bidder with what it paid, in the order of its first bid" }),
		},
		{ description: "The bidding closed and the highest bid won the seal" },
	),
	seal_used: Type.Object({ seal: Seal, holder: Id, target: Id }, { description: "The bearer broke the seal on a resident, who is banished at once" }),
	seal_expired: Type.Object(
		{ seal: Seal, holder: Type.Optional(Id), reason: Type.String({ description: "Why it is gone, in the old words" }) },
		{ description: "A seal is gone unused, or its auction ended without a winner" },
	),
});

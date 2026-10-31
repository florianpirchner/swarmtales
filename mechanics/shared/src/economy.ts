/**
 * The APIs of team T1 (economy): names, ledger, marks, receipts. FROZEN in wave 3.0; a change goes
 * through the integration owner (docs/design/carve-plan.md, "Shared files"). Each method names the
 * old `World` code it replaces; a `command` writes `service_called` and causes the provider's
 * events, a `query` leaves no trace.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { MarksChannel, MarksLeft, OfResident, ReceiptBody, ResidentId } from "./schemas.ts";

/** Names for ids (step 1). The names mechanic also gives `presentation.resolve` and `presentation.display`. */
export const NamesApi = defineApi({
	name: "names",
	summary: "Names residents chose, for texts and arguments.",
	methods: {
		hasNames: query("Whether the story names residents at all (old `hasNames`).", Type.Object({}), Type.Boolean()),
		nameOf: query("The chosen name, or null (old `nameOf`).", OfResident, Type.Union([Type.String(), Type.Null()])),
		labelOf: query("The name, or the id while there is none (old `labelOf`).", OfResident, Type.String()),
		resolve: query("The id a name or id stands for; other text comes back unchanged (old `resolveResident`).", Type.Object({ text: Type.String() }), Type.String()),
	},
});

const Account = Type.String({ description: "A resident id or a system account of the old Ledger (escrow, treasury, SYSTEM_MINT_BURN)." });
const Amount = Type.Number({ exclusiveMinimum: 0 });

/** Points (step 2). */
export const LedgerApi = defineApi({
	name: "ledger",
	summary: "Points per account and bookings between accounts.",
	methods: {
		balance: query("An account's points (old `ledger.balance`).", Type.Object({ account: Account }), Type.Number()),
		balances: query("Every resident's points, for rankings and standings.", Type.Object({}), Type.Record(Type.String(), Type.Number())),
		mint: command("Creates points: start points, rewards, director grants (old `ledger.mint`, `adjustPoints` > 0); writes `ledger_entry`.", Type.Object({ account: Account, amount: Amount, reason: Type.String() }), Type.Null()),
		burn: command("Destroys points: fines, penalties, an exile (old `ledger.burn`, `adjustPoints` < 0); writes `ledger_entry`.", Type.Object({ account: Account, amount: Amount, reason: Type.String() }), Type.Null()),
		move: command(
			"Books points between accounts without the resident checks: escrow, treasuries, ransom, bids (old `ledger.transfer`); writes `ledger_entry` only, never `transfer`.",
			Type.Object({ from: Account, to: Account, amount: Amount, reason: Type.String() }),
			Type.Union([Type.Object({ ok: Type.Literal(true), txId: Type.String() }), Type.Object({ ok: Type.Literal(false), code: Type.Literal("INSUFFICIENT_FUNDS") })]),
		),
	},
});

/** Marks (step 3): the price of a message within a refill window. */
export const MarksApi = defineApi({
	name: "marks",
	summary: "The marks a message costs and what is left of them.",
	methods: {
		canAfford: query("Whether the resident may send on the channel now (old `#canAfford`); true without marks.", Type.Object({ resident: ResidentId, channel: MarksChannel }), Type.Boolean()),
		left: query("The resident's marks, or null when the story has none.", OfResident, Type.Union([MarksLeft, Type.Null()])),
		spend: command("Spends the channel's price once a message was sent (old `#spend`); writes `marks_spent`; null when marks do not apply.", Type.Object({ resident: ResidentId, channel: MarksChannel }), Type.Union([MarksLeft, Type.Null()])),
	},
});

/** Receipts (step 5): proofs of transfers, escrow, treasuries, level-ups and delivered DMs. */
export const ReceiptsApi = defineApi({
	name: "receipts",
	summary: "City-verified receipts.",
	methods: {
		issue: command("Issues a receipt (old `#issue`); writes `receipt_issued`.", Type.Object({ body: ReceiptBody }), Type.Object({ id: Type.String(), text: Type.String() })),
		count: query("How many receipts a resident holds (its status part).", OfResident, Type.Integer()),
		memoTransfers: query("Transfers with a memo the resident sent from minute `since` on; they count toward the DM cap (old `dmWindow`).", Type.Object({ resident: ResidentId, since: Type.Integer() }), Type.Integer()),
		describe: query("The receipt line of a body (old `describeReceipt`), for texts other mechanics write.", Type.Object({ body: ReceiptBody }), Type.String()),
	},
});

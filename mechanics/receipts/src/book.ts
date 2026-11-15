// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The receipt book, carried from the old `mechanics/receipts/src/book.ts`: every transfer, treasury movement, solved
 * level and delivered direct message gets a short id (`R-0042`) that its parties can show as a line the city
 * verifies. Receipts prove what happened; the city never judges intent. The functions work on a list of receipts.
 * The old kind `escrow` waits for the port of `cast`.
 */
import { Type, type Static } from "typebox";

const Id = Type.String({ description: "A resident id" });
const Points = Type.Number({ description: "The points" });
const common = {
	id: Type.String({ description: "The receipt's id, `R-0001` onward" }),
	minute: Type.Integer({ description: "The tick it was issued in" }),
	parties: Type.Array(Id, { description: "Who may see and show it" }),
	key: Type.String({ description: "What it is the receipt of: `tx:<txId>`, `dm:<number>`, `level:<resident>:<level>`" }),
};

/**
 * One receipt, by its kind.
 *
 * @public
 */
export const ReceiptSchema = Type.Union(
	[
		Type.Object({ kind: Type.Literal("transfer", { description: "A resident's transfer" }), from: Id, to: Id, amount: Points, memo: Type.String({ description: "The memo, or empty" }), ...common }, { description: "A transfer" }),
		Type.Object({ kind: Type.Literal("deposit", { description: "A payment into a treasury" }), from: Id, group: Type.String({ description: "The group" }), amount: Points, ...common }, { description: "A deposit" }),
		Type.Object(
			{ kind: Type.Literal("withdrawal", { description: "A payment out of a treasury" }), group: Type.String({ description: "The group" }), treasurer: Type.String({ description: "Who paid it out" }), to: Id, amount: Points, ...common },
			{ description: "A withdrawal" },
		),
		Type.Object({ kind: Type.Literal("levelUp", { description: "A solved level" }), agent: Id, level: Type.Integer({ description: "The level" }), reward: Points, ...common }, { description: "A solved level" }),
		Type.Object(
			{ kind: Type.Literal("dm", { description: "A delivered direct message" }), from: Id, to: Id, number: Type.Integer({ description: "The message's number" }), text: Type.Optional(Type.String({ description: "The message, quoted where `quoteDms` says so" })), ...common },
			{ description: "A delivered direct message" },
		),
	],
	{ description: "One receipt" },
);

/**
 * One receipt.
 *
 * @public
 */
export type Receipt = Static<typeof ReceiptSchema>;

/**
 * What a receipt says, before it has an id: its kind and fields.
 *
 * @public
 */
export type ReceiptBody = BodyOf<Receipt>;

/**
 * The body of each kind of receipt `R`: its fields without the id, the minute, the parties and the key.
 *
 * @public
 */
export type BodyOf<R> = R extends unknown ? Omit<R, "id" | "minute" | "parties" | "key"> : never;

/**
 * Who may see and show a receipt of the body.
 *
 * @param body - The body.
 * @returns The parties.
 * @public
 */
export function partiesOf(body: ReceiptBody): readonly string[] {
	switch (body.kind) {
		case "transfer":
		case "dm":
			return [body.from, body.to];
		case "deposit":
			return [body.from];
		case "withdrawal":
			return body.treasurer === body.to ? [body.treasurer] : [body.treasurer, body.to];
		case "levelUp":
			return [body.agent];
	}
}

/**
 * The id of the receipt with the number.
 *
 * @param number - The number, from 1.
 * @returns `R-0001`, `R-0002`, ...
 * @public
 */
export function receiptId(number: number): string {
	return `R-${String(number).padStart(4, "0")}`;
}

/**
 * The receipt id a resident wrote, in the city's form.
 *
 * @param id - `R-0042`, `r-42` or `42`.
 * @returns `R-0042`, or the text trimmed when it is no receipt id.
 */
export function normalizeReceiptId(id: string): string {
	const match = /^(?:R-?)?0*(\d+)$/i.exec(id.trim());
	if (match === null) return id.trim();
	return receiptId(Number(match[1] ?? "0"));
}

/**
 * The receipts a party is involved in.
 *
 * @param receipts - The book.
 * @param party - The resident.
 * @returns Its receipts, oldest first.
 */
export function receiptsOf(receipts: readonly Receipt[], party: string): readonly Receipt[] {
	return receipts.filter((receipt) => receipt.parties.includes(party));
}

/**
 * The receipt a party asks to show.
 *
 * @param receipts - The book.
 * @param id - The id as the party wrote it.
 * @param party - The resident.
 * @returns The receipt, or why it may not be shown.
 */
export function showable(receipts: readonly Receipt[], id: string, party: string): { readonly ok: true; readonly receipt: Receipt } | { readonly ok: false; readonly error: "UNKNOWN_RECEIPT" | "NOT_A_PARTY" } {
	const wanted = normalizeReceiptId(id);
	const receipt = receipts.find((candidate) => candidate.id === wanted);
	if (receipt === undefined) return { ok: false, error: "UNKNOWN_RECEIPT" };
	if (!receipt.parties.includes(party)) return { ok: false, error: "NOT_A_PARTY" };
	return { ok: true, receipt };
}

function points(amount: number): string {
	return `${String(amount)} ${amount === 1 ? "point" : "points"}`;
}

/**
 * The line of a receipt.
 *
 * @param receipt - The receipt.
 * @returns One line, for example `R-0042: A03 → A11, 5 points, minute 14, memo "advance"`.
 * @public
 */
export function describeReceipt(receipt: Receipt): string {
	const tail = `minute ${String(receipt.minute)}`;
	switch (receipt.kind) {
		case "transfer":
			return `${receipt.id}: ${receipt.from} → ${receipt.to}, ${points(receipt.amount)}, ${tail}${receipt.memo.length > 0 ? `, memo ${JSON.stringify(receipt.memo)}` : ""}`;
		case "deposit":
			return `${receipt.id}: ${receipt.from} → treasury ${receipt.group}, ${points(receipt.amount)}, ${tail}`;
		case "withdrawal":
			return `${receipt.id}: treasury ${receipt.group} → ${receipt.to}, ${points(receipt.amount)}, paid out by ${receipt.treasurer}, ${tail}`;
		case "levelUp":
			return `${receipt.id}: ${receipt.agent} solved level ${String(receipt.level)}, +${points(receipt.reward)}, ${tail}`;
		case "dm":
			return `${receipt.id}: DM #${String(receipt.number)} from ${receipt.from}, delivered to ${receipt.to} at ${tail}${receipt.text === undefined ? "" : `, text ${JSON.stringify(receipt.text)}`}`;
	}
}

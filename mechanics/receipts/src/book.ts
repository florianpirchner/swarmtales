/**
 * Receipts (SPEC 8), copied from packages/engine/src/receipts.ts (`ReceiptBook`): every transfer,
 * treasury movement, escrow payment, level-up and delivered DM gets a short ID (`R-0042`) that its
 * parties can show as a city-verified line, on the board or privately to one resident. Receipts
 * prove what happened; the city never judges intent. The functions work on the mechanic's state.
 */
import type { Static } from "typebox";
import type { ReceiptBody } from "@swarmtales/mechanic-shared";

export type Receipt = Static<typeof ReceiptBody> & {
	readonly id: string;
	readonly minute: number;
	/** Who may see and show the receipt. */
	readonly parties: readonly string[];
};

export type ShowReceiptError = "UNKNOWN_RECEIPT" | "NOT_A_PARTY";

export function partiesOf(body: Static<typeof ReceiptBody>): readonly string[] {
	switch (body.kind) {
		case "transfer":
			return [body.from, body.to];
		case "escrow":
			return [body.cast, body.to];
		case "deposit":
			return [body.from];
		case "withdrawal":
			return body.treasurer === body.to ? [body.treasurer] : [body.treasurer, body.to];
		case "levelUp":
			return [body.agent];
		case "dm":
			return [body.from, body.to];
	}
}

/** The id the next receipt gets: `R-0001`, `R-0002`, ... */
export function nextId(receipts: readonly Receipt[]): string {
	return `R-${String(receipts.length + 1).padStart(4, "0")}`;
}

/** Accepts `R-0042`, `r-42` and `42`. */
export function normalizeReceiptId(id: string): string {
	const match = /^(?:R-?)?0*(\d+)$/i.exec(id.trim());
	if (match === null) return id.trim();
	return `R-${(match[1] ?? "").padStart(4, "0")}`;
}

export function receiptById(receipts: readonly Receipt[], id: string): Receipt | undefined {
	const wanted = normalizeReceiptId(id);
	return receipts.find((receipt) => receipt.id === wanted);
}

/** Receipts `party` is involved in, oldest first. */
export function receiptsOf(receipts: readonly Receipt[], party: string): readonly Receipt[] {
	return receipts.filter((receipt) => receipt.parties.includes(party));
}

/** The receipt, if `party` may show it. */
export function showable(receipts: readonly Receipt[], id: string, party: string): { readonly ok: true; readonly receipt: Receipt } | { readonly ok: false; readonly error: ShowReceiptError } {
	const receipt = receiptById(receipts, id);
	if (receipt === undefined) return { ok: false, error: "UNKNOWN_RECEIPT" };
	if (!receipt.parties.includes(party)) return { ok: false, error: "NOT_A_PARTY" };
	return { ok: true, receipt };
}

function points(amount: number): string {
	return `${String(amount)} ${amount === 1 ? "point" : "points"}`;
}

/** One line, e.g. `R-0042: A03 → A11, 5 points, minute 14, memo "advance"`. */
export function describeReceipt(receipt: Receipt): string {
	const tail = `minute ${String(receipt.minute)}`;
	switch (receipt.kind) {
		case "transfer":
			return `${receipt.id}: ${receipt.from} → ${receipt.to}, ${points(receipt.amount)}, ${tail}${receipt.memo.length > 0 ? `, memo ${JSON.stringify(receipt.memo)}` : ""}`;
		case "escrow":
			return `${receipt.id}: ${receipt.cast} → ${receipt.to}, ${points(receipt.amount)}, ${tail}`;
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

/**
 * The private line a resident reads when another shows it a receipt. A real show and a forgery
 * (Whispers) go through this one function, so both read alike to the byte; a forgery differs only
 * in the quoted text.
 */
export function shownPrivatelyText(by: string, receipt: Receipt): string {
	return `${by} shows you a receipt: the city verifies ${describeReceipt(receipt)}.`;
}

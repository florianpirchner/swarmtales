/**
 * Receipts (SPEC 8): every transfer, treasury movement, escrow payment and
 * level-up gets a short ID (`R-0042`) that its parties can show on the board
 * as a city-verified line. Receipts prove what happened; the city never
 * judges intent.
 */
import type { CompetitorId } from "../core/ids.ts";
import { assertNever } from "../core/result.ts";

export type ReceiptBody =
	| { readonly kind: "transfer"; readonly from: CompetitorId; readonly to: CompetitorId; readonly amount: number; readonly memo: string }
	| { readonly kind: "escrow"; readonly cast: string; readonly to: CompetitorId; readonly amount: number }
	| { readonly kind: "deposit"; readonly from: CompetitorId; readonly group: string; readonly amount: number }
	| {
			readonly kind: "withdrawal";
			readonly group: string;
			readonly treasurer: CompetitorId;
			readonly to: CompetitorId;
			readonly amount: number;
	  }
	| { readonly kind: "levelUp"; readonly agent: CompetitorId; readonly level: number; readonly reward: number };

export type ReceiptKind = ReceiptBody["kind"];

export type Receipt = ReceiptBody & {
	readonly id: string;
	readonly minute: number;
	/** Who may see and show the receipt. */
	readonly parties: readonly string[];
};

export type ShowReceiptError = "UNKNOWN_RECEIPT" | "NOT_A_PARTY";

export class ReceiptBook {
	readonly #receipts = new Map<string, Receipt>();
	readonly #byParty = new Map<string, Receipt[]>();

	issue(body: ReceiptBody, minute: number): Receipt {
		const id = `R-${String(this.#receipts.size + 1).padStart(4, "0")}`;
		const receipt: Receipt = { ...body, id, minute, parties: partiesOf(body) };
		this.#add(receipt);
		return receipt;
	}

	#add(receipt: Receipt): void {
		this.#receipts.set(receipt.id, receipt);
		for (const party of receipt.parties) {
			const list = this.#byParty.get(party) ?? [];
			list.push(receipt);
			this.#byParty.set(party, list);
		}
	}

	/** Every receipt in issue order, for run snapshots (SPEC 17). */
	snapshot(): readonly Receipt[] {
		return [...this.#receipts.values()];
	}

	/** Replaces every receipt; ids must run R-0001, R-0002, ... as issued. */
	restore(receipts: readonly Receipt[]): void {
		this.#receipts.clear();
		this.#byParty.clear();
		receipts.forEach((receipt, index) => {
			const expected = `R-${String(index + 1).padStart(4, "0")}`;
			if (receipt.id !== expected) throw new Error(`Receipt snapshot: receipt ${index + 1} has id ${receipt.id}, expected ${expected}`);
			this.#add(receipt);
		});
	}

	get(id: string): Receipt | undefined {
		return this.#receipts.get(normalizeReceiptId(id));
	}

	/** Receipts `party` is involved in, oldest first. */
	of(party: string): readonly Receipt[] {
		return this.#byParty.get(party) ?? [];
	}

	/** The receipt, if `party` may show it. */
	showable(id: string, party: string): { readonly ok: true; readonly receipt: Receipt } | { readonly ok: false; readonly error: ShowReceiptError } {
		const receipt = this.get(id);
		if (receipt === undefined) return { ok: false, error: "UNKNOWN_RECEIPT" };
		if (!receipt.parties.includes(party)) return { ok: false, error: "NOT_A_PARTY" };
		return { ok: true, receipt };
	}
}

/** Accepts `R-0042`, `r-42` and `42`. */
export function normalizeReceiptId(id: string): string {
	const match = /^(?:R-?)?0*(\d+)$/i.exec(id.trim());
	if (match === null) return id.trim();
	return `R-${(match[1] ?? "").padStart(4, "0")}`;
}

function partiesOf(body: ReceiptBody): readonly string[] {
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
		default:
			return assertNever(body, "receipt");
	}
}

/** One line, e.g. `R-0042: A03 → A11, 5 points, minute 14, memo "advance"`. */
export function describeReceipt(receipt: Receipt): string {
	const tail = `minute ${receipt.minute}`;
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
			return `${receipt.id}: ${receipt.agent} solved level ${receipt.level}, +${points(receipt.reward)}, ${tail}`;
		default:
			return assertNever(receipt, "receipt");
	}
}

function points(amount: number): string {
	return `${amount} ${amount === 1 ? "point" : "points"}`;
}

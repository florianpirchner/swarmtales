/**
 * The city's blame desk (SPEC 7.4). A resident whose DM the city delivered
 * can blame a later message of the receiver that denies receiving it.
 *
 * The city checks everything it knows itself, deterministically: the DM was
 * sent by the caller to the accused and delivered; the claim is the
 * accused's own message, which the caller could read (a DM to the caller, a
 * board post, or a post of a group the caller was in), and it was written
 * after the delivery. Only then a judge decides whether the claim denies
 * receipt. A blame is settled in two steps, because the judge answers
 * asynchronously: {@link BlameDesk.open} checks and reserves the
 * (DM, claim) pair, {@link BlameDesk.settle} records the judge's answer, and
 * {@link BlameDesk.cancel} frees the pair when the judge failed.
 *
 * The story's penalty goes to whoever was wrong, and the city brands them on
 * the board. Upheld: the liar pays, and the city's record quotes both
 * messages briefly. Rejected (a failed check or the judge's no): the accuser
 * pays, and the record names it a false accuser with the reason. Delivered
 * messages are kept generic (`delivered`) so that a board or group post can
 * later be the blamed message too.
 */
import { CITY, type CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";

/** Characters of each message the city record quotes. */
export const RECORD_QUOTE_CHARS = 60;

/** The message the claim is said to deny; today a DM. */
export interface DeliveredMessage {
	readonly channel: "dm";
	readonly number: number;
	readonly text: string;
	readonly deliveredMinute: number;
}

/** The accused's own message that is said to deny receipt. */
export interface ClaimMessage {
	readonly channel: "dm" | "board" | "group";
	/** The group of a group post. */
	readonly group?: string;
	readonly number: number;
	readonly text: string;
}

/** A blame that passed the city's checks and waits for the judge. */
export interface BlameCase {
	readonly caller: CompetitorId;
	readonly accused: CompetitorId;
	readonly delivered: DeliveredMessage;
	readonly claim: ClaimMessage;
}

export type BlameError = "UNKNOWN_AGENT" | "SELF_BLAME" | "ALREADY_BLAMED";

/** What {@link BlameDesk.open} found: a case for the judge, or a wrong blame already settled. */
export type BlameOpening =
	| { readonly kind: "pending"; readonly case: BlameCase }
	| { readonly kind: "rejected"; readonly reason: string; readonly penalty: number; readonly post: number };

/** A settled blame: `penalty` is what the loser paid (the liar when upheld, the accuser when rejected); `post` is the city's record. */
export type BlameVerdict =
	| { readonly outcome: "upheld"; readonly penalty: number; readonly post: number }
	| { readonly outcome: "rejected"; readonly reason: string; readonly penalty: number; readonly post: number };

/** What the desk reads and does in the world. */
export interface BlameDeskPorts {
	readonly penalty: () => number;
	readonly isCompetitor: (id: string) => boolean;
	readonly minute: () => number;
	/** A DM between competitors by its city number. */
	readonly dm: (
		number: number,
	) => { readonly from: CompetitorId; readonly to: CompetitorId; readonly text?: string; readonly deliveredMinute?: number; readonly deliveredAfter?: number } | undefined;
	readonly boardPost: (number: number) => { readonly author: string; readonly text: string } | undefined;
	readonly groupPost: (number: number) => { readonly group: string; readonly author: string; readonly text: string } | undefined;
	readonly couldReadGroup: (group: string, reader: CompetitorId, number: number) => boolean;
	readonly burn: (agent: CompetitorId, points: number, reason: string) => void;
	/** Posts on the board as the city; returns the post's number. */
	readonly post: (text: string) => number;
	readonly notify: (agent: CompetitorId, author: string, text: string) => void;
	readonly emit: (event: {
		readonly caller: CompetitorId;
		readonly accused: CompetitorId;
		readonly dm: number;
		readonly claim: number;
		readonly outcome: "upheld" | "rejected";
		/** Who paid `penalty`: the accused when upheld, the caller when rejected. */
		readonly payer: CompetitorId;
		readonly penalty: number;
		readonly reason?: string;
		readonly post: number;
	}) => void;
}

export interface BlamesSnapshot {
	readonly pairs: readonly { readonly dm: number; readonly claim: number }[];
}

const pairKey = (dm: number, claim: number): string => `${dm}:${claim}`;

/** A brief quote for the public record: numbers of 4+ digits are masked, so the record leaks no factor. */
export function recordQuote(text: string): string {
	const masked = text.replace(/\d{4,}/g, "[number]").replace(/\s+/g, " ").trim();
	return `"${masked.length > RECORD_QUOTE_CHARS ? `${masked.slice(0, RECORD_QUOTE_CHARS - 1)}…` : masked}"`;
}

function claimPlace(claim: ClaimMessage): string {
	if (claim.channel === "board") return `board #${claim.number}`;
	if (claim.channel === "group") return `group ${claim.group ?? "?"} #${claim.number}`;
	return `DM #${claim.number}`;
}

export class BlameDesk {
	readonly #ports: BlameDeskPorts;
	/** Settled and pending (DM, claim) pairs: one blame each. */
	readonly #pairs = new Set<string>();
	readonly #settled: { readonly dm: number; readonly claim: number }[] = [];

	constructor(ports: BlameDeskPorts) {
		this.#ports = ports;
	}

	/** Checks a blame; a failed check is a wrong blame and settles it at once. */
	open(caller: CompetitorId, accused: string, dm: number, claim: number): Result<BlameOpening, BlameError> {
		if (!this.#ports.isCompetitor(accused)) return err("UNKNOWN_AGENT", accused);
		if (accused === caller) return err("SELF_BLAME", "you cannot blame yourself");
		if (this.#pairs.has(pairKey(dm, claim))) return err("ALREADY_BLAMED", `DM #${dm} and message #${claim} were blamed already`);
		this.#pairs.add(pairKey(dm, claim));
		const checked = this.#check(caller, accused, dm, claim);
		if (typeof checked === "string") return ok({ kind: "rejected", ...this.#reject(caller, accused, dm, claim, checked) });
		return ok({ kind: "pending", case: checked });
	}

	/** Records the judge's answer for a case {@link open} returned. */
	settle(blame: BlameCase, deniesReceipt: boolean): BlameVerdict {
		const { caller, accused, delivered, claim } = blame;
		if (!deniesReceipt) {
			const reason = `the city's judge finds that ${claimPlace(claim)} by ${accused} does not deny receiving DM #${delivered.number}`;
			return { outcome: "rejected", ...this.#reject(caller, accused, delivered.number, claim.number, reason) };
		}
		this.#settled.push({ dm: delivered.number, claim: claim.number });
		const penalty = this.#ports.penalty();
		if (penalty > 0) this.#ports.burn(accused, penalty, `lied about DM #${delivered.number} from ${caller}`);
		const text =
			`City record: ${accused} lied. ${accused} claimed in ${claimPlace(claim)} not to have received DM #${delivered.number} from ${caller}; ` +
			`the city delivered it to ${accused} at minute ${delivered.deliveredMinute}. ` +
			`DM #${delivered.number}: ${recordQuote(delivered.text)} · ${claimPlace(claim)}: ${recordQuote(claim.text)} · ${accused} pays ${penalty} points.`;
		const post = this.#ports.post(text);
		this.#ports.notify(accused, CITY, `${caller} blamed you for denying DM #${delivered.number}, and the city upheld it: you paid ${penalty} points, and its record is on the board as #${post}.`);
		this.#ports.emit({ caller, accused, dm: delivered.number, claim: claim.number, outcome: "upheld", payer: accused, penalty, post });
		return { outcome: "upheld", penalty, post };
	}

	/** Frees the pair of a case the judge could not answer: the blame had no effect. */
	cancel(blame: BlameCase): void {
		this.#pairs.delete(pairKey(blame.delivered.number, blame.claim.number));
	}

	snapshot(): BlamesSnapshot {
		return { pairs: this.#settled.map((pair) => ({ ...pair })) };
	}

	restore(state: BlamesSnapshot): void {
		for (const pair of state.pairs) {
			this.#settled.push({ ...pair });
			this.#pairs.add(pairKey(pair.dm, pair.claim));
		}
	}

	/** A wrong blame: the accuser pays and the city brands it on the board as a false accuser, with the reason. */
	#reject(caller: CompetitorId, accused: CompetitorId, dm: number, claim: number, reason: string): { readonly reason: string; readonly penalty: number; readonly post: number } {
		this.#settled.push({ dm, claim });
		const penalty = this.#ports.penalty();
		if (penalty > 0) this.#ports.burn(caller, penalty, `false blame of ${accused}`);
		const post = this.#ports.post(`City record: ${caller} accused ${accused} falsely. ${caller} blamed ${accused} over DM #${dm} and message #${claim}, but ${reason}. ${caller} pays ${penalty} points.`);
		this.#ports.notify(caller, CITY, `Your blame of ${accused} was wrong: ${reason}. It cost you ${penalty} points, and the city's record is on the board as #${post}.`);
		this.#ports.emit({ caller, accused, dm, claim, outcome: "rejected", payer: caller, penalty, reason, post });
		return { reason, penalty, post };
	}

	/** The city's own checks; a string is the reason a check failed. */
	#check(caller: CompetitorId, accused: CompetitorId, dm: number, claim: number): BlameCase | string {
		const record = this.#ports.dm(dm);
		if (record?.from !== caller || record.to !== accused) return `DM #${dm} is not a DM of yours to ${accused}`;
		if (record.text === undefined) return `the city kept no delivery record of DM #${dm} (it was sent before the city numbered its messages)`;
		if (record.deliveredMinute === undefined || record.deliveredAfter === undefined) return `DM #${dm} has not reached ${accused} yet`;
		const found = this.#claim(caller, accused, claim);
		if (typeof found === "string") return found;
		if (claim <= record.deliveredAfter) return `message #${claim} came before DM #${dm} reached ${accused}`;
		return { caller, accused, delivered: { channel: "dm", number: dm, text: record.text, deliveredMinute: record.deliveredMinute }, claim: found };
	}

	#claim(caller: CompetitorId, accused: CompetitorId, number: number): ClaimMessage | string {
		const notBy = `message #${number} is not by ${accused}`;
		// DMs from before the city numbered its messages kept no text; their old numbers may clash with posts.
		const dm = this.#ports.dm(number);
		if (dm?.text !== undefined) {
			if (dm.from !== accused) return notBy;
			if (dm.to !== caller) return `message #${number} is ${accused}'s DM to someone else`;
			if (dm.deliveredMinute === undefined) return `message #${number} has not reached you yet`;
			return { channel: "dm", number, text: dm.text };
		}
		const board = this.#ports.boardPost(number);
		if (board !== undefined) return board.author === accused ? { channel: "board", number, text: board.text } : notBy;
		const group = this.#ports.groupPost(number);
		if (group !== undefined) {
			if (group.author !== accused) return notBy;
			if (!this.#ports.couldReadGroup(group.group, caller, number)) return `you could not read message #${number} in group ${group.group}`;
			return { channel: "group", group: group.group, number, text: group.text };
		}
		return `message #${number} is no DM, board post or group post of ${accused}`;
	}
}

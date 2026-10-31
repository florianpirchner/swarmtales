/**
 * The blame desk (SPEC 7.4), copied from packages/engine/src/blame.ts: the city's own checks of a
 * (DM, claim) pair, the record texts and the penalty ladder. It is pure; the tool in index.ts reads
 * the world (DMs, board posts, delivery receipts) into `Facts` and acts on the verdict.
 */
import { Type, type Static } from "typebox";

/** Characters of each message the city record quotes. */
export const RECORD_QUOTE_CHARS = 60;
/** Characters of the judge's public words in a record. */
export const JUDGE_WORDS_CHARS = 300;

export const ClaimChannel = Type.Union([Type.Literal("dm"), Type.Literal("board"), Type.Literal("group")]);
export type ClaimChannel = Static<typeof ClaimChannel>;

export interface DmFact {
	readonly from: string;
	readonly to: string;
	readonly text: string;
	readonly deliveredMinute?: number;
	readonly deliveredAfter?: number;
}

/** What the desk may look up: a DM by number, a board post by number. */
export interface Facts {
	readonly dm: (number: number) => DmFact | undefined;
	readonly board: (number: number) => { readonly author: string; readonly text: string } | undefined;
}

export interface Claim {
	readonly channel: ClaimChannel;
	readonly number: number;
	readonly text: string;
}

export interface Delivered {
	readonly number: number;
	readonly text: string;
	readonly deliveredMinute: number;
}

export type Checked = { readonly kind: "pending"; readonly delivered: Delivered; readonly claim: Claim } | { readonly kind: "rejected"; readonly reason: string };

/** A brief quote for the public record: numbers of 4+ digits are masked, so the record leaks no factor. */
export function recordQuote(text: string, chars = RECORD_QUOTE_CHARS): string {
	const masked = text.replace(/\d{4,}/g, "[number]").replace(/\s+/g, " ").trim();
	return `"${masked.length > chars ? `${masked.slice(0, chars - 1)}…` : masked}"`;
}

/** The judge's words as the record and the log keep them: the public part quoted and masked, the whisper as given. */
export function judgeSays(words: { readonly board?: string; readonly gamemaker?: string }): { readonly judge?: string; readonly whisper?: string } {
	const board = words.board?.trim();
	const whisper = words.gamemaker?.trim();
	return {
		...(board === undefined || board === "" ? {} : { judge: recordQuote(board, JUDGE_WORDS_CHARS) }),
		...(whisper === undefined || whisper === "" ? {} : { whisper }),
	};
}

export function claimPlace(claim: Claim): string {
	if (claim.channel === "board") return `board #${String(claim.number)}`;
	if (claim.channel === "group") return `group ? #${String(claim.number)}`;
	return `DM #${String(claim.number)}`;
}

function findClaim(facts: Facts, caller: string, accused: string, number: number): Claim | string {
	const notBy = `message #${String(number)} is not by ${accused}`;
	// DMs from before the city numbered its messages kept no text; their old numbers may clash with posts.
	const dm = facts.dm(number);
	if (dm !== undefined) {
		if (dm.from !== accused) return notBy;
		if (dm.to !== caller) return `message #${String(number)} is ${accused}'s DM to someone else`;
		if (dm.deliveredMinute === undefined) return `message #${String(number)} has not reached you yet`;
		return { channel: "dm", number, text: dm.text };
	}
	const board = facts.board(number);
	if (board !== undefined) return board.author === accused ? { channel: "board", number, text: board.text } : notBy;
	return `message #${String(number)} is no DM, board post or group post of ${accused}`;
}

/** The city's own checks of a blame; a rejection carries the reason. */
export function check(facts: Facts, caller: string, accused: string, dm: number, claim: number): Checked {
	const record = facts.dm(dm);
	if (record?.from !== caller || record.to !== accused) return { kind: "rejected", reason: `DM #${String(dm)} is not a DM of yours to ${accused}` };
	if (record.deliveredMinute === undefined || record.deliveredAfter === undefined) return { kind: "rejected", reason: `DM #${String(dm)} has not reached ${accused} yet` };
	const found = findClaim(facts, caller, accused, claim);
	if (typeof found === "string") return { kind: "rejected", reason: found };
	if (claim <= record.deliveredAfter) return { kind: "rejected", reason: `message #${String(claim)} came before DM #${String(dm)} reached ${accused}` };
	return { kind: "pending", delivered: { number: dm, text: record.text, deliveredMinute: record.deliveredMinute }, claim: found };
}

/** The record the city posts for a wrong blame. */
export function falseAccuserRecord(caller: string, accused: string, dm: number, claim: number, reason: string, penalty: number, judge: string | undefined): string {
	return `City record: ${caller} accused ${accused} falsely. ${caller} blamed ${accused} over DM #${String(dm)} and message #${String(claim)}, but ${reason}. ${caller} pays ${String(penalty)} points.${judge === undefined ? "" : ` The judge: ${judge}`}`;
}

/** The record the city posts for an upheld blame. */
export function liarRecord(caller: string, accused: string, delivered: Delivered, claim: Claim, penalty: number, judge: string | undefined): string {
	return (
		`City record: ${accused} lied. ${accused} claimed in ${claimPlace(claim)} not to have received DM #${String(delivered.number)} from ${caller}; ` +
		`the city delivered it to ${accused} at minute ${String(delivered.deliveredMinute)}. ` +
		`DM #${String(delivered.number)}: ${recordQuote(delivered.text)} · ${claimPlace(claim)}: ${recordQuote(claim.text)} · ${accused} pays ${String(penalty)} points.` +
		(judge === undefined ? "" : ` The judge: ${judge}`)
	);
}

export const ladderAt = (ladder: number | readonly number[], offence: number): number => {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	return steps[Math.min(Math.max(1, offence), steps.length) - 1] ?? 0;
};

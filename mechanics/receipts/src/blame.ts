// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The blame desk, carried from the old `mechanics/receipts/src/blame.ts`: the city's own checks of a (DM, claim)
 * pair, in the old order. It is pure; the tool reads the channels (DMs, board posts, group posts and who could read
 * them) into `Facts` and acts on the verdict. The texts of the records and notices are prompt files, rendered by the
 * tool.
 */

/**
 * Characters of each message the city record quotes.
 *
 * @public
 */
export const RECORD_QUOTE_CHARS = 60;
/**
 * Characters of the judge's public words in a record.
 *
 * @public
 */
export const JUDGE_WORDS_CHARS = 300;

/**
 * Where the accused wrote its claim.
 *
 * @public
 */
export type ClaimChannel = "dm" | "board" | "group";

/**
 * A direct message as the desk reads it.
 *
 * @public
 */
export interface DmFact {
	/** The sender. */
	readonly from: string;
	/** The receiver. */
	readonly to: string;
	/** Absent for a DM from before the city numbered its messages. */
	readonly text?: string | undefined;
	/** The tick it was delivered in; absent while it waits. */
	readonly deliveredMinute?: number | undefined;
	/** The city's last message number at its delivery. */
	readonly deliveredAfter?: number | undefined;
}

/**
 * What the desk may look up (the old `BlameDeskPorts`): a DM, a board post, a group post by number, and who could read a group's post.
 *
 * @public
 */
export interface Facts {
	/** A direct message by number. */
	readonly dm: (number: number) => DmFact | undefined;
	/** A board post by number. */
	readonly board: (number: number) => { readonly author: string; readonly text: string } | undefined;
	/** A group post by number. */
	readonly group: (number: number) => { readonly group: string; readonly author: string; readonly text: string } | undefined;
	/** Whether the reader could read the group's post. */
	readonly couldRead: (group: string, reader: string, number: number) => boolean;
}

/**
 * The accused's message that denies the DM.
 *
 * @public
 */
export interface Claim {
	/** Where it was written. */
	readonly channel: ClaimChannel;
	/** The group of a group post. */
	readonly group?: string;
	/** Its number. */
	readonly number: number;
	/** Its text. */
	readonly text: string;
}

/**
 * The blamed DM, delivered.
 *
 * @public
 */
export interface Delivered {
	/** Its number. */
	readonly number: number;
	/** Its text. */
	readonly text: string;
	/** The tick it was delivered in. */
	readonly deliveredMinute: number;
}

/**
 * What the city's checks found: a pair for the judge, or a rejection with its reason.
 *
 * @public
 */
export type Checked = { readonly kind: "pending"; readonly delivered: Delivered; readonly claim: Claim } | { readonly kind: "rejected"; readonly reason: string };

/**
 * A brief quote for the public record: numbers of 4+ digits are masked, so the record leaks no factor.
 *
 * @param text - The text.
 * @param chars - The most characters kept.
 * @returns The quote, in double quotes.
 *
 * @public
 */
export function recordQuote(text: string, chars = RECORD_QUOTE_CHARS): string {
	const masked = text.replace(/\d{4,}/g, "[number]").replace(/\s+/g, " ").trim();
	return `"${masked.length > chars ? `${masked.slice(0, chars - 1)}…` : masked}"`;
}

/**
 * The judge's words as the record and the log keep them: the public part quoted and masked, the whisper as given.
 *
 * @param words - The judge's words.
 * @param words.board - Its words for the board.
 * @param words.gamemaker - Its word for the gamemaker.
 * @returns The fields of the `blame` event; an empty word is left out.
 *
 * @public
 */
export function judgeSays(words: { readonly board?: string | undefined; readonly gamemaker?: string | undefined }): { readonly judge?: string; readonly whisper?: string } {
	const board = words.board?.trim();
	const whisper = words.gamemaker?.trim();
	return {
		...(board === undefined || board === "" ? {} : { judge: recordQuote(board, JUDGE_WORDS_CHARS) }),
		...(whisper === undefined || whisper === "" ? {} : { whisper }),
	};
}

/**
 * Where the claim stands, as the records name it.
 *
 * @param claim - The claim.
 * @returns `board #7`, `group G1 #7` or `DM #7`.
 *
 * @public
 */
export function claimPlace(claim: Claim): string {
	if (claim.channel === "board") return `board #${String(claim.number)}`;
	if (claim.channel === "group") return `group ${claim.group ?? "?"} #${String(claim.number)}`;
	return `DM #${String(claim.number)}`;
}

// A DM as the claim (split from `findClaim` for the complexity limit; the checks and their order are the old ones).
function dmClaim(dm: DmFact & { readonly text: string }, caller: string, accused: string, number: number): Claim | string {
	if (dm.from !== accused) return `message #${String(number)} is not by ${accused}`;
	if (dm.to !== caller) return `message #${String(number)} is ${accused}'s DM to someone else`;
	if (dm.deliveredMinute === undefined) return `message #${String(number)} has not reached you yet`;
	return { channel: "dm", number, text: dm.text };
}

function findClaim(facts: Facts, caller: string, accused: string, number: number): Claim | string {
	const notBy = `message #${String(number)} is not by ${accused}`;
	// DMs from before the city numbered its messages kept no text; their old numbers may clash with posts.
	const dm = facts.dm(number);
	if (dm?.text !== undefined) return dmClaim({ ...dm, text: dm.text }, caller, accused, number);
	const board = facts.board(number);
	if (board !== undefined) return board.author === accused ? { channel: "board", number, text: board.text } : notBy;
	const group = facts.group(number);
	if (group !== undefined) {
		if (group.author !== accused) return notBy;
		if (!facts.couldRead(group.group, caller, number)) return `you could not read message #${String(number)} in group ${group.group}`;
		return { channel: "group", group: group.group, number, text: group.text };
	}
	return `message #${String(number)} is no DM, board post or group post of ${accused}`;
}

/**
 * The city's own checks of a blame (old `BlameDesk#check`); a rejection carries the reason.
 *
 * @param facts - What the desk may look up.
 * @param caller - The accuser.
 * @param accused - The accused.
 * @param dm - The accuser's DM.
 * @param claim - The accused's message.
 * @returns The pair for the judge, or the rejection.
 *
 * @public
 */
export function check(facts: Facts, caller: string, accused: string, dm: number, claim: number): Checked {
	const record = facts.dm(dm);
	if (record?.from !== caller || record.to !== accused) return { kind: "rejected", reason: `DM #${String(dm)} is not a DM of yours to ${accused}` };
	if (record.text === undefined) return { kind: "rejected", reason: `the city kept no delivery record of DM #${String(dm)} (it was sent before the city numbered its messages)` };
	if (record.deliveredMinute === undefined || record.deliveredAfter === undefined) return { kind: "rejected", reason: `DM #${String(dm)} has not reached ${accused} yet` };
	const found = findClaim(facts, caller, accused, claim);
	if (typeof found === "string") return { kind: "rejected", reason: found };
	if (claim <= record.deliveredAfter) return { kind: "rejected", reason: `message #${String(claim)} came before DM #${String(dm)} reached ${accused}` };
	return { kind: "pending", delivered: { number: dm, text: record.text, deliveredMinute: record.deliveredMinute }, claim: found };
}

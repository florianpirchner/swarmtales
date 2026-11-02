/**
 * The blame desk (SPEC 7.4), copied from packages/engine/src/blame.ts: the city's own checks of a
 * (DM, claim) pair, in the old order. It is pure; the tool reads the channels (DMs, board posts,
 * group posts and who could read them) into `Facts` and acts on the verdict. The texts of the
 * records and notices are prompt files, rendered by the tool.
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
	/** Absent for a DM from before the city numbered its messages. */
	readonly text?: string | undefined;
	readonly deliveredMinute?: number | undefined;
	readonly deliveredAfter?: number | undefined;
}

/** What the desk may look up (the old `BlameDeskPorts`): a DM, a board post, a group post by number, and who could read a group's post. */
export interface Facts {
	readonly dm: (number: number) => DmFact | undefined;
	readonly board: (number: number) => { readonly author: string; readonly text: string } | undefined;
	readonly group: (number: number) => { readonly group: string; readonly author: string; readonly text: string } | undefined;
	readonly couldRead: (group: string, reader: string, number: number) => boolean;
}

export interface Claim {
	readonly channel: ClaimChannel;
	/** The group of a group post. */
	readonly group?: string;
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
	if (claim.channel === "group") return `group ${claim.group ?? "?"} #${String(claim.number)}`;
	return `DM #${String(claim.number)}`;
}

function findClaim(facts: Facts, caller: string, accused: string, number: number): Claim | string {
	const notBy = `message #${String(number)} is not by ${accused}`;
	// DMs from before the city numbered its messages kept no text; their old numbers may clash with posts.
	const dm = facts.dm(number);
	if (dm?.text !== undefined) {
		if (dm.from !== accused) return notBy;
		if (dm.to !== caller) return `message #${String(number)} is ${accused}'s DM to someone else`;
		if (dm.deliveredMinute === undefined) return `message #${String(number)} has not reached you yet`;
		return { channel: "dm", number, text: dm.text };
	}
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

/** The city's own checks of a blame (old `BlameDesk#check`); a rejection carries the reason. */
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

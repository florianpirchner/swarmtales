/**
 * The methods of `ChannelsApi` and `NotesApi` that read the city's records (the rest is wired in
 * index.ts to the functions that carry them out).
 */
import type { Static } from "typebox";
import type { BoardPost as SharedBoardPost, DmRecord as SharedDmRecord, GroupPost as SharedGroupPost } from "@swarmtales/mechanic-shared";
import type { Ctx } from "./messages.ts";
import { inboxOf } from "./messages.ts";
import type { DmRecordState } from "./state.ts";

type DmRecord = Static<typeof SharedDmRecord>;
type BoardPost = Static<typeof SharedBoardPost>;
type GroupPost = Static<typeof SharedGroupPost>;

/** A DM record as the shared shape shows it: the delivery fields only once the DM was delivered. */
export function dmRecordOf(record: DmRecordState): DmRecord {
	return {
		id: record.id,
		from: record.from,
		to: record.to,
		minute: record.minute,
		answered: record.answered,
		// A record of an old snapshot may have kept no text; it stays absent (R2-D14), so blame answers "kept no delivery record".
		...(record.text === undefined ? {} : { text: record.text }),
		...(record.deliveredMinute === undefined ? {} : { deliveredMinute: record.deliveredMinute }),
		...(record.deliveredAfter === undefined ? {} : { deliveredAfter: record.deliveredAfter }),
	};
}

export function dmRecord(ctx: Ctx, number: number): DmRecord | null {
	const found = ctx.state.dms.find((record) => record.id === number);
	return found === undefined ? null : dmRecordOf(found);
}

export function boardPost(ctx: Ctx, number: number): BoardPost | null {
	const post = ctx.state.board.get(number);
	return post === undefined ? null : { number: post.seq, author: post.author, text: post.text, kind: post.kind, minute: post.minute };
}

export function groupPost(ctx: Ctx, number: number): GroupPost | null {
	const found = ctx.state.groups.postByNumber(number);
	return found === undefined ? null : { number: found.post.seq, group: found.group, author: found.post.author, text: found.post.text, minute: found.post.minute };
}

/** DMs waiting in the resident's inbox. */
export function pendingDms(ctx: Ctx, resident: string): number {
	return ctx.state.inboxes.has(resident) ? inboxOf(ctx, resident).mailbox.size : 0;
}

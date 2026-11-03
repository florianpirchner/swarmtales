/**
 * The channels state of both sides in one shape: the old world snapshot's `board`, `groups`, `dms`,
 * `messages` and the mailbox and notices of each competitor, and the same fields of the channels
 * slice of a host snapshot (the slice was cut from exactly these old fields).
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { HostSnapshot } from "@swarmtales/contracts";

const Inbox = Type.Object({ agent: Type.String(), mailbox: Type.Array(Type.Unknown()), notices: Type.Array(Type.Unknown()) });
const Slice = Type.Object({ board: Type.Unknown(), groups: Type.Unknown(), dms: Type.Array(Type.Unknown()), messages: Type.Optional(Type.Integer()), inboxes: Type.Array(Inbox) });
const Old = Type.Object({ board: Type.Unknown(), groups: Type.Unknown(), dms: Type.Array(Type.Unknown()), messages: Type.Optional(Type.Integer()), competitors: Type.Array(Inbox) });

export interface ChannelsState {
	readonly board: unknown;
	readonly groups: unknown;
	readonly dms: readonly unknown[];
	readonly messages: number | undefined;
	readonly inboxes: readonly { readonly agent: string; readonly mailbox: readonly unknown[]; readonly notices: readonly unknown[] }[];
}

/** The state out of the old world's snapshot (as recorded, step 18, item 7b). */
export function oldState(snapshot: unknown): ChannelsState {
	const parsed = Parse(Old, JSON.parse(JSON.stringify(snapshot)));
	return { board: parsed.board, groups: parsed.groups, dms: parsed.dms, messages: parsed.messages, inboxes: parsed.competitors.map(({ agent, mailbox, notices }) => ({ agent, mailbox, notices })) };
}

/** The state out of the channels slice of a host snapshot. */
export function newState(snapshot: HostSnapshot): ChannelsState {
	const slice = snapshot.mechanics.channels;
	if (slice === undefined) throw new Error("the host snapshot holds no channels slice");
	const parsed = Parse(Slice, JSON.parse(JSON.stringify(slice.data)));
	return { board: parsed.board, groups: parsed.groups, dms: parsed.dms, messages: parsed.messages, inboxes: parsed.inboxes };
}

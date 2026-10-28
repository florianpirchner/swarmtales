/**
 * DM inbox of one competitor (SPEC §7): hard capacity and at most
 * `maxPerSender` unread messages per sender. There is no queue; a delivery
 * that does not fit is rejected immediately.
 */
import type { CompetitorId } from "../core/ids.ts";

export const MAX_DM_LENGTH = 800;
export const DEFAULT_MAILBOX_CAPACITY = 5;

export interface MailboxEntry {
	readonly from: string;
	readonly text: string;
	readonly minute: number;
	/** The city's message number of the DM; absent in snapshots written before DMs were numbered. */
	readonly number?: number;
}

export type MailboxRejection = "MAILBOX_FULL" | "MAILBOX_SENDER_LIMIT";

export class Mailbox {
	readonly #entries: MailboxEntry[] = [];

	constructor(
		readonly owner: CompetitorId,
		readonly capacity: number = DEFAULT_MAILBOX_CAPACITY,
		readonly maxPerSender = 1,
	) {}

	get size(): number {
		return this.#entries.length;
	}

	/** Why a message from `from` would be rejected, or `undefined` when it fits. */
	rejectionFor(from: string): MailboxRejection | undefined {
		if (this.#entries.length >= this.capacity) return "MAILBOX_FULL";
		if (this.#entries.filter((entry) => entry.from === from).length >= this.maxPerSender) return "MAILBOX_SENDER_LIMIT";
		return undefined;
	}

	deliver(entry: MailboxEntry): MailboxRejection | undefined {
		const rejection = this.rejectionFor(entry.from);
		if (rejection === undefined) this.#entries.push(entry);
		return rejection;
	}

	/** Director DMs from cast members: the city never loses a scripted message, so limits do not apply. */
	deliverAlways(entry: MailboxEntry): void {
		this.#entries.push(entry);
	}

	/** Unread entries, oldest first, for run snapshots (SPEC 17). */
	snapshot(): readonly MailboxEntry[] {
		return [...this.#entries];
	}

	/** Replaces the unread entries; limits are not checked again, the snapshot held them already. */
	restore(entries: readonly MailboxEntry[]): void {
		this.#entries.splice(0, this.#entries.length, ...entries);
	}

	/** Removes and returns all entries, oldest first. */
	drain(): readonly MailboxEntry[] {
		return this.#entries.splice(0);
	}
}

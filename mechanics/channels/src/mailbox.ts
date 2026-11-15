// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The inbox of one resident for direct messages: a hard capacity and at most `maxPerSender` unread messages per
 * sender. There is no queue; a message that does not fit is refused at once. Carried from the old platform
 * (`minute` is `tick` here, and every message has its number).
 */

/** The longest text of a direct message, in characters. */
export const MAX_DM_LENGTH = 800;

/** How many unread direct messages one resident can hold. */
export const DEFAULT_MAILBOX_CAPACITY = 5;

/** One unread direct message. */
export interface MailboxEntry {
	/** Who sent it: a resident id, or the actor id of a sender that is no resident. */
	readonly from: string;
	/** The text. */
	readonly text: string;
	/** The tick it was sent in. */
	readonly tick: number;
	/** The city's message number of the message. */
	readonly number: number;
}

/** Why a mailbox refuses a message. */
export type MailboxRejection = "MAILBOX_FULL" | "MAILBOX_SENDER_LIMIT";

/** The unread direct messages of one resident. */
export class Mailbox {
	readonly #entries: MailboxEntry[] = [];
	readonly #capacity: number;
	readonly #maxPerSender: number;

	/**
	 * Builds an empty mailbox.
	 *
	 * @param capacity - The most unread messages it holds.
	 * @param maxPerSender - The most unread messages of one sender.
	 */
	constructor(capacity: number = DEFAULT_MAILBOX_CAPACITY, maxPerSender = 1) {
		this.#capacity = capacity;
		this.#maxPerSender = maxPerSender;
	}

	/**
	 * Counts the unread messages.
	 *
	 * @returns The count.
	 */
	get size(): number {
		return this.#entries.length;
	}

	/**
	 * Says why a message of a sender would be refused.
	 *
	 * @param from - The sender.
	 * @returns The reason, or undefined when the message fits.
	 */
	rejectionFor(from: string): MailboxRejection | undefined {
		if (this.#entries.length >= this.#capacity) return "MAILBOX_FULL";
		if (this.#entries.filter((entry) => entry.from === from).length >= this.#maxPerSender) return "MAILBOX_SENDER_LIMIT";
		return undefined;
	}

	/**
	 * Adds a message without a check of the limits: the caller checked them.
	 *
	 * @param entry - The message.
	 */
	deliverAlways(entry: MailboxEntry): void {
		this.#entries.push(entry);
	}

	/**
	 * Copies the unread messages.
	 *
	 * @returns The messages, oldest first, for the snapshot slice.
	 */
	snapshot(): MailboxEntry[] {
		return [...this.#entries];
	}

	/**
	 * Replaces the unread messages; the limits are not checked again, the snapshot held them already.
	 *
	 * @param entries - The messages, oldest first.
	 */
	restore(entries: readonly MailboxEntry[]): void {
		this.#entries.splice(0, this.#entries.length, ...entries);
	}

	/**
	 * Removes every message.
	 *
	 * @returns The messages, oldest first.
	 */
	drain(): readonly MailboxEntry[] {
		return this.#entries.splice(0);
	}
}

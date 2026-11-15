// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The city's message numbers: one number space for every message a reader can cite, board posts and direct
 * messages alike. Numbers only grow, so a higher number is always a later message. Carried from the old platform.
 */
export class MessageNumbers {
	#last = 0;

	/**
	 * The number of the latest message.
	 *
	 * @returns The number; 0 before the first message.
	 */
	get last(): number {
		return this.#last;
	}

	/**
	 * Takes the next number.
	 *
	 * @returns The number.
	 */
	next(): number {
		this.#last += 1;
		return this.#last;
	}

	/**
	 * Restores the counter: never below a number already in use.
	 *
	 * @param number - A number that is in use.
	 */
	raiseTo(number: number): void {
		this.#last = Math.max(this.#last, number);
	}
}

/**
 * The city's message numbers (SPEC 7): one number space for every message a
 * reader can cite, DMs, board posts, group posts and game master notes alike.
 * Numbers only grow, so a higher number is always a later message.
 */
export class MessageNumbers {
	#last = 0;

	/** The number of the latest message; 0 before the first. */
	get last(): number {
		return this.#last;
	}

	next(): number {
		this.#last += 1;
		return this.#last;
	}

	/**
	 * Restores the counter: never below a number already in use. A snapshot
	 * written before the numbers were shared restores from the highest board,
	 * group and DM numbers it holds, so new numbers stay unique.
	 */
	raiseTo(number: number): void {
		this.#last = Math.max(this.#last, number);
	}
}

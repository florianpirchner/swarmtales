/**
 * Virtual run clock. One round equals one virtual minute; minute 0 is the
 * first round. The engine never reads wall-clock time.
 */
export class VirtualClock {
	#minute: number;

	/** `startMinute` is where a resumed run continues (SPEC 17); a fresh run starts at 0. */
	constructor(
		readonly durationMinutes: number,
		startMinute = 0,
	) {
		if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
			throw new RangeError(`Invalid run duration: ${durationMinutes}`);
		}
		if (!Number.isInteger(startMinute) || startMinute < 0) throw new RangeError(`Invalid start minute: ${startMinute}`);
		this.#minute = startMinute;
	}

	get minute(): number {
		return this.#minute;
	}

	get remainingMinutes(): number {
		return Math.max(0, this.durationMinutes - this.#minute);
	}

	advance(): number {
		this.#minute += 1;
		return this.#minute;
	}
}

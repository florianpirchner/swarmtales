// SPDX-License-Identifier: Apache-2.0
/** Helpers of the hold'em tests. */

/**
 * A part of the head that the head declares; the head's type leaves every part optional.
 *
 * @param value - The part.
 * @param what - Its name, for the message.
 * @returns The part.
 * @throws TypeError when the head lacks it.
 */
export function defined<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new TypeError(`holdem: the head has no ${what}`);
	return value;
}

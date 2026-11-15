// SPDX-License-Identifier: Apache-2.0
/**
 * The open offers as a trader reads them, with its own offers marked when the option `markOwnOffers` is on (A46,
 * P478): a seat took its own offer for another's and tried to accept it. With the option off, the text is the old one.
 */
import { offerLine } from "./market.ts";
import type { Offer } from "./model.ts";

/**
 * The mark after the id of a trader's own offer, in the full line.
 *
 * @public
 */
export const OWN_MARK = "(your own offer: others may accept it, you cannot; withdraw it if you no longer want it)";

/**
 * The mark after the id of a trader's own offer, in the short list of ids.
 *
 * @public
 */
export const OWN_SHORT = "(your own)";

const mine = (offer: Offer, reader: string, mark: boolean): boolean => mark && offer.from === reader;

/**
 * The open offers of the round text: each offer's line, joined by ` | `.
 *
 * @param offers - The offers the reader sees.
 * @param reader - The trader who reads the text.
 * @param mark - Whether the reader's own offers are marked.
 * @returns The text; `none` without an offer.
 *
 * @public
 */
export function offersText(offers: readonly Offer[], reader: string, mark: boolean): string {
	if (offers.length === 0) return "none";
	return offers
		.map((offer) => {
			const line = offerLine(offer, reader);
			return mine(offer, reader, mark) ? `${offer.id} ${OWN_MARK}${line.slice(offer.id.length)}` : line;
		})
		.join(" | ");
}

/**
 * The ids of the open offers, for the short line of a later turn in the same round.
 *
 * @param offers - The offers the reader sees.
 * @param reader - The trader who reads the text.
 * @param mark - Whether the reader's own offers are marked.
 * @returns The ids joined by `, `; `none` without an offer.
 *
 * @public
 */
export function offerIdsText(offers: readonly Offer[], reader: string, mark: boolean): string {
	if (offers.length === 0) return "none";
	return offers.map((offer) => (mine(offer, reader, mark) ? `${offer.id} ${OWN_SHORT}` : offer.id)).join(", ");
}

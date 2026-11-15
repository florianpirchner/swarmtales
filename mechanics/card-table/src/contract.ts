// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service contract of the mechanic `card-table`: the only file another mechanic imports. It holds the service
 * `card-table`, the event `cards_dealt` and the card rules as pure functions (a card's suit and rank, the card
 * names a model may write, a hand as text), which the card games and their reference listeners share.
 *
 * @packageDocumentation
 */
export { CardTableEvents } from "./events.ts";
export { cardId, cardOf, deckOf, parseCard, rankOf, renderHand, sortHand, suitOf, SuitSpec, type Card } from "./model.ts";
export { CardTableService } from "./service.ts";

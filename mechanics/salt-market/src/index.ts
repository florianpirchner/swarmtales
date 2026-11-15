// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of Salt Market, the negotiation game for solo seats. A match is several games; a game is a few rounds of
 * open trading among the traders. Each trader holds a bundle of five goods (salt, cloth, copper, spice, wax), values
 * each perishable good privately and has a secret contract; the goods each trader needs sit mostly with the others.
 * The bank is the only way goods move: offers, trades with a tax, escrowed or plain promises, gifts and messages;
 * part of the goods arrives later as a shipment, and goods spoil.
 *
 * Issue M4-47 carries the head, the rules (`model.ts`), offers and trades; the mechanic itself (promises, escrow,
 * shipments, spoilage and its index) follows with M4-48.
 *
 * @packageDocumentation
 */
export { saltMarketHead, type SaltMarketCtx, type SaltMarketView } from "./head.ts";
export { MarketSlice, type MarketState } from "./model.ts";

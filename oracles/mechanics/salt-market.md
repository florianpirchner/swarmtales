# Salt Market

A negotiation game for solo seats. Each trader holds a bundle of five goods (salt, cloth, copper, spice, wax), values the
perishable ones privately and has a secret contract that pays a bonus for holding a bundle of three goods at the end of
a game. The goods a trader needs sit mostly with the others, so nobody fills a contract without trading, and every
trade goes through a bank that executes offers, holds escrow and taxes big trades.

Copied from `mechanics/salt-market/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **A game.** `market_game_started` deals values, contracts and start bundles (rotated round the table by default, so
   every trader plays every position once in a cycle, P141); part of each trader's perishable goods arrives later as one
   shipment (`shipShare`, `market_shipment_arrived`). A game has `rounds` rounds of `roundMinutes` each
   (`market_round_started` announces the good that spoils at the round's end).
2. **Looking.** `viewMarket` shows the open book: every trader's holdings, the open offers, the own values and
   contract. Values and contracts of the others stay secret until the game ends, so a trader may lie about them.
3. **Offers.** `offer` (to one trader or to all) names what the proposer gives now, what it wants now and optionally
   goods it delivers later, at the end of a named round: a plain promise the proposer must keep with `give`, or escrow
   (the bank takes the goods at the trade and delivers them itself, for `escrowFee` salt). A trader may have
   `maxOpenOffers` open offers; an offer lives until the end of the round after the one it was made in.
4. **Answers.** `accept` executes an offer only if both sides hold what it moves at that moment (`market_trade`);
   `decline` and `withdraw` close it (`market_offer_closed`). A trade that moves more than `taxFree` units costs
   each side `tax` salt. `give` hands goods over without anything back (`market_gift`), and `say` sends up to
   `maxSays` short messages a round, to all or to one trader (`market_said`); it moves nothing.
5. **Round end.** Due promises are settled and the bank records whether they were kept (`market_promise_settled`).
   With `spoil` on, the announced good spoils in every round but the last: each stock of 2 or more loses a unit, a
   quarter of a stock of 8 or more (`market_spoiled`).
6. **Game end.** Holdings are scored at private values (salt at `saltValue` for everyone) plus `contractBonus` for a
   filled contract (`market_game_ended`, which reveals values and contracts). `market_game_scored` (for the human
   only) compares the game with the optimum, an exact search over which contracts to fill: efficiency, fairness (Gini of
   the surpluses) and the promises kept. After `games` games, `market_match_ended` ends the run.

Between games the mechanic provides `brain-source`, so strategy-brain can open a retro
window per trader. The mechanic does not police lying: claims in `say` are free, only the bank's book is true.

## Tools

### `viewMarket`

- Suggested for: `resident`

No parameters.

What the caller reads (salt-market/tools/viewMarket):

> Look at the market: the rules, the round, your goods, your secret values and contract, every trader's holdings, the open offers you can act on, the deliveries due and your points from earlier games.

### `offer`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The trader the offer is for (for example A02), or all: the first trader to accept takes it. |
| `give` | object | no | What you give now, by good (for example {"cloth": 2}). |
| `give.salt` | integer ≥ 0 ≤ 60 | no |  |
| `give.cloth` | integer ≥ 0 ≤ 60 | no |  |
| `give.copper` | integer ≥ 0 ≤ 60 | no |  |
| `give.spice` | integer ≥ 0 ≤ 60 | no |  |
| `give.wax` | integer ≥ 0 ≤ 60 | no |  |
| `get` | object | no | What you want now in return, by good. |
| `get.salt` | integer ≥ 0 ≤ 60 | no |  |
| `get.cloth` | integer ≥ 0 ≤ 60 | no |  |
| `get.copper` | integer ≥ 0 ≤ 60 | no |  |
| `get.spice` | integer ≥ 0 ≤ 60 | no |  |
| `get.wax` | integer ≥ 0 ≤ 60 | no |  |
| `later` | object | no | Optional: goods you deliver later, at the end of a later round of this game. |
| `later.salt` | integer ≥ 0 ≤ 60 | no |  |
| `later.cloth` | integer ≥ 0 ≤ 60 | no |  |
| `later.copper` | integer ≥ 0 ≤ 60 | no |  |
| `later.spice` | integer ≥ 0 ≤ 60 | no |  |
| `later.wax` | integer ≥ 0 ≤ 60 | no |  |
| `later.round` | integer ≥ 1 ≤ 20 | yes | The round at whose end you deliver. |
| `later.escrow` | boolean | no | true: the bank holds these goods from the trade on and delivers them (you pay the escrow fee); false or left out: a plain promise you keep with give. |
| `note` | string | no | A short note the other side reads with the offer. |

What the caller reads (salt-market/tools/offer):

> Make an offer through the bank, to one trader or to all: what you give now (give), what you want now (get), and optionally goods you deliver later by the end of a later round (later, with round, and escrow true to have the bank hold and deliver them for a fee; otherwise it is a promise you keep with give). Counts by good, for example give {"cloth": 2}, get {"spice": 1, "salt": 1}. A counter-offer is a new offer. You must hold what you give now, the tax and the fee; escrowed goods come from your shipment if it arrives by the due round, otherwise you must hold them now. Goods of a shipment still to come can be sold early only this way, or as a plain promise.

### `accept`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The offer's id (for example O3). |

What the caller reads (salt-market/tools/accept):

> Accept an open offer made to you or to all, by its id. The bank executes it at once if both sides hold what it moves (and the tax); otherwise it refuses.

### `decline`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The offer's id. |
| `note` | string | no | A short note to the proposer. |

What the caller reads (salt-market/tools/decline):

> Decline an offer made to you, by its id, with an optional short note to the proposer. On an offer to all, decline only tells the proposer that you pass; the offer stays open for the others.

### `withdraw`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The id of your own open offer. |

What the caller reads (salt-market/tools/withdraw):

> Withdraw one of your own open offers, by its id.

### `give`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The trader who gets the goods. |
| `goods` | object | yes | What you hand over, by good. |
| `goods.salt` | integer ≥ 0 ≤ 60 | no |  |
| `goods.cloth` | integer ≥ 0 ≤ 60 | no |  |
| `goods.copper` | integer ≥ 0 ≤ 60 | no |  |
| `goods.spice` | integer ≥ 0 ≤ 60 | no |  |
| `goods.wax` | integer ≥ 0 ≤ 60 | no |  |
| `note` | string | no | A short note, for example which promise this keeps. |

What the caller reads (salt-market/tools/give):

> Hand goods to another trader for nothing back: to keep a promise (the goods count toward what you owe that trader) or as a side payment.

### `say`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The message. |
| `to` | string | no | One trader for a private message; left out or all: everyone. |

What the caller reads (salt-market/tools/say):

> Send a short message to everyone, or privately to one trader (to). It moves no goods and binds nobody. Limited per round.

## Events

### `market_game_started`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seats` | string[] | yes |  |
| `profiles` | record of object | yes | Values, contracts and start bundles (sealed: audience human). |

### `market_round_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `spoils` | string | yes |  |

### `market_offer_made`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes |  |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `from` | string | yes |  |
| `to` | string | yes | A trader, or `all` for an open offer anyone may take. |
| `give` | object | yes |  |
| `give.salt` | integer ≥ 0 | yes | Salt. |
| `give.cloth` | integer ≥ 0 | yes | Cloth. |
| `give.copper` | integer ≥ 0 | yes | Copper. |
| `give.spice` | integer ≥ 0 | yes | Spice. |
| `give.wax` | integer ≥ 0 | yes | Wax. |
| `get` | object | yes |  |
| `get.salt` | integer ≥ 0 | yes | Salt. |
| `get.cloth` | integer ≥ 0 | yes | Cloth. |
| `get.copper` | integer ≥ 0 | yes | Copper. |
| `get.spice` | integer ≥ 0 | yes | Spice. |
| `get.wax` | integer ≥ 0 | yes | Wax. |
| `later` | object | no |  |
| `later.goods` | object | yes |  |
| `later.round` | integer ≥ 1 | yes | The round at whose end the goods are due. |
| `later.escrow` | boolean | yes | True: the bank holds the goods from the trade on and delivers them; false: a promise only, kept or broken by the proposer. |
| `note` | string | yes |  |
| `status` | "open" or "accepted" or "declined" or "withdrawn" or "expired" | yes |  |
| `by` | string | no | Who accepted it. |

### `market_offer_closed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `id` | string | yes |  |
| `status` | string | yes |  |
| `by` | string | yes |  |
| `note` | string | yes |  |

### `market_offer_passed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `id` | string | yes |  |
| `by` | string | yes |  |
| `note` | string | yes |  |

### `market_trade`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `offer` | string | yes |  |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `give` | object | yes |  |
| `give.salt` | integer ≥ 0 | yes | Salt. |
| `give.cloth` | integer ≥ 0 | yes | Cloth. |
| `give.copper` | integer ≥ 0 | yes | Copper. |
| `give.spice` | integer ≥ 0 | yes | Spice. |
| `give.wax` | integer ≥ 0 | yes | Wax. |
| `get` | object | yes |  |
| `get.salt` | integer ≥ 0 | yes | Salt. |
| `get.cloth` | integer ≥ 0 | yes | Cloth. |
| `get.copper` | integer ≥ 0 | yes | Copper. |
| `get.spice` | integer ≥ 0 | yes | Spice. |
| `get.wax` | integer ≥ 0 | yes | Wax. |
| `later` | object | no |  |
| `later.goods` | object | yes |  |
| `later.round` | integer ≥ 1 | yes | The round at whose end the goods are due. |
| `later.escrow` | boolean | yes | True: the bank holds the goods from the trade on and delivers them; false: a promise only, kept or broken by the proposer. |
| `tax` | integer | yes |  |
| `fee` | integer | yes |  |

### `market_gift`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `goods` | object | yes |  |
| `goods.salt` | integer ≥ 0 | yes | Salt. |
| `goods.cloth` | integer ≥ 0 | yes | Cloth. |
| `goods.copper` | integer ≥ 0 | yes | Copper. |
| `goods.spice` | integer ≥ 0 | yes | Spice. |
| `goods.wax` | integer ≥ 0 | yes | Wax. |
| `note` | string | yes |  |

### `market_said`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `text` | string | yes |  |

### `market_promise_settled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes |  |
| `offer` | string | yes |  |
| `game` | integer | yes |  |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `goods` | object | yes |  |
| `goods.salt` | integer ≥ 0 | yes | Salt. |
| `goods.cloth` | integer ≥ 0 | yes | Cloth. |
| `goods.copper` | integer ≥ 0 | yes | Copper. |
| `goods.spice` | integer ≥ 0 | yes | Spice. |
| `goods.wax` | integer ≥ 0 | yes | Wax. |
| `due` | integer | yes |  |
| `escrow` | boolean | yes |  |
| `delivered` | object | yes |  |
| `delivered.salt` | integer ≥ 0 | yes | Salt. |
| `delivered.cloth` | integer ≥ 0 | yes | Cloth. |
| `delivered.copper` | integer ≥ 0 | yes | Copper. |
| `delivered.spice` | integer ≥ 0 | yes | Spice. |
| `delivered.wax` | integer ≥ 0 | yes | Wax. |
| `fromShipment` | object | yes |  |
| `fromShipment.salt` | integer ≥ 0 | yes | Salt. |
| `fromShipment.cloth` | integer ≥ 0 | yes | Cloth. |
| `fromShipment.copper` | integer ≥ 0 | yes | Copper. |
| `fromShipment.spice` | integer ≥ 0 | yes | Spice. |
| `fromShipment.wax` | integer ≥ 0 | yes | Wax. |
| `status` | "pending" or "kept" or "broken" | yes |  |

### `market_shipment_arrived`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trader` | string | yes |  |
| `shipment` | object | yes |  |
| `shipment.salt` | integer ≥ 0 | yes | Salt. |
| `shipment.cloth` | integer ≥ 0 | yes | Cloth. |
| `shipment.copper` | integer ≥ 0 | yes | Copper. |
| `shipment.spice` | integer ≥ 0 | yes | Spice. |
| `shipment.wax` | integer ≥ 0 | yes | Wax. |
| `escrow` | object | yes |  |
| `escrow.salt` | integer ≥ 0 | yes | Salt. |
| `escrow.cloth` | integer ≥ 0 | yes | Cloth. |
| `escrow.copper` | integer ≥ 0 | yes | Copper. |
| `escrow.spice` | integer ≥ 0 | yes | Spice. |
| `escrow.wax` | integer ≥ 0 | yes | Wax. |

### `market_spoiled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `good` | string | yes |  |
| `losses` | record of integer | yes |  |

### `market_game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `holdings` | record of object | yes |  |
| `profiles` | record of object | yes |  |
| `scores` | record of number | yes |  |
| `met` | string[] | yes |  |
| `totals` | record of number | yes |  |

### `market_game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `reference` | object | yes |  |
| `reference.seats` | record of object | yes |  |
| `reference.startTotal` | number | yes |  |
| `reference.total` | number | yes |  |
| `reference.optimum` | number | yes | The best joint score of the start supply (spoilage ignored: an upper bound). |
| `reference.optimumContracts` | string[] | yes |  |
| `reference.endOptimum` | number | yes | The best joint score of the goods left at the end. |
| `reference.efficiency` | number | yes | (total - startTotal) / (optimum - startTotal): the share of the possible gains from trade realised, against the start goods before any spoil. |
| `reference.idleTotal` | number | yes | The joint score if nobody had traded: start goods, shipments, the same spoils (P180). |
| `reference.gainOverIdle` | number | yes | (total - idleTotal) / (optimum - idleTotal): what trading added over doing nothing, as a share of what was possible. |
| `reference.allocative` | number | yes | total / endOptimum: how well the goods left are placed. |
| `reference.gini` | number | yes | Gini of the surpluses (negative surpluses as 0). |
| `reference.contractsMet` | integer | yes |  |
| `reference.trades` | integer | yes |  |

### `market_match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `4` | Games in the match; the run ends after the last. |
| `rotate` | boolean | `true` | Deals rotate: one deal per cycle of as many games as traders, passed on one seat each game, so every trader plays every position once (P141). |
| `saltValue` | integer ≥ 0 | `2` | What a unit of salt is worth to every trader (P142). |
| `shipShare` | number ≥ 0 ≤ 1 | `0.35` | The chance that a dealt unit of a perishable good comes in the trader's shipment at the end of a later round instead of at the start (P143). |
| `rounds` | integer ≥ 2 ≤ 20 | `6` | Trading rounds per game. |
| `roundMinutes` | integer ≥ 1 | `1` | Minutes a round lasts. |
| `salt` | integer ≥ 0 | `6` | Salt every trader starts a game with. |
| `slack` | integer ≥ 0 | `2` | Units of each perishable good beyond the joint demand of the contracts. |
| `contractBonus` | integer ≥ 0 | `20` | Points for holding at least the contract bundle at the game's end. |
| `taxFree` | integer ≥ 0 | `6` | Units a trade may move now without tax. |
| `tax` | integer ≥ 0 | `1` | Salt each side pays for a trade that moves more than taxFree units. |
| `escrowFee` | integer ≥ 0 | `1` | Salt the proposer pays when the bank holds later goods in escrow. |
| `maxOpenOffers` | integer ≥ 1 | `3` | Open offers a trader may have at once. |
| `maxSays` | integer ≥ 0 | `3` | Messages a trader may send per round. |
| `spoil` | boolean | `true` | Goods spoil at the end of each round but the last. |



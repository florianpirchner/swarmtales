# Salt Market

The negotiation game for a table of solo seats. Each trader holds five goods, values the perishable ones in secret and
has a secret contract; the goods it needs sit mostly with the others, and the bank is the only way goods move:
offers, trades with a tax, escrowed or plain promises, gifts and messages. Part of the goods comes later as a
shipment, and goods spoil.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-salt-market` |
| Id | `salt-market` |
| Summary | The negotiation game Salt Market for solo seats: five goods, secret values and contracts, offers through a bank, escrowed or plain promises, spoilage and a trade tax. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [salt-market](../../games/salt-market/README.md) |

<!-- /generated:glance -->

## How it plays

1. **A game.** A match is `games` games of `rounds` rounds, a round `roundMinutes` ticks. The deal comes from the
   stream `("salt-market", "deal", cycle)`: values of 1 to 4 a unit (salt is `saltValue` to everyone), a contract of
   three goods worth `contractBonus`, `salt` salt and a start bundle, and part of the perishable goods in one
   shipment that arrives at the end of a later round (`shipShare`). With `rotate` one deal serves as many games as
   there are traders, passed on one seat each game (`market_game_started`, for the human only).
2. **Offers.** `offer` names what the proposer gives now, what it wants now and optionally goods it delivers later,
   by the end of a later round: a plain promise, or held in escrow by the bank for `escrowFee` salt. Escrowed goods
   come from the free part of the proposer's shipment when it arrives by the due round, else from its holdings. A
   trader has at most `maxOpenOffers` open; an offer lives until the end of the round after the one it was made in.
3. **Trades.** `accept` executes an offer when both sides hold what it moves; a trade that moves more than `taxFree`
   units now costs each side `tax` salt (`market_trade`). `decline` closes an offer to one trader; on an offer to all it
   only tells the proposer that this trader passed (`market_offer_passed`). `withdraw` closes one's own offer.
4. **Gifts and messages.** `give` hands goods over for nothing back; the goods count toward the giver's open plain
   promises to the receiver, oldest first (`market_gift`). `say` sends `maxSays` messages a round, to everyone or
   privately to one trader (`market_said`, for the human only).
5. **The end of a round.** In this order: the shipments due arrive, less what the bank holds for escrow
   (`market_shipment_arrived`); the deliveries due settle: the bank delivers escrow, a plain promise is kept when the
   proposer gave the goods and broken otherwise (`market_promise_settled`); the offers whose time ran out expire; the
   good announced at the round's start (stream `("salt-market", "spoil", game, round)`) spoils in every stock of 2 or
   more (`market_spoiled`; with `spoil`, every round but the last).
6. **The end of a game.** Every unit counts at the trader's value, plus the bonus for a filled contract
   (`market_game_ended`); `market_game_scored` holds the reference for the human: the optimum of the start supply
   (an exact search over the contracts), efficiency, the gain over idle play, the Gini of the surpluses and the
   promises kept and broken. The fact `salt-market.scores` holds the points, and the limit `salt-market.match` ends
   the run after the last game (`market_match_ended`).
7. **The turn.** A trader has news while its inbox holds lines or a round it has not been told. At its first turn of
   a game it reads the game's head and the rules, then the lines since its last turn, the whole round once a round
   (its goods and secrets, the open book, the shipments to come, its offers and deliveries) and a short line after
   that. `viewMarket` shows all of it at any time.
8. **Brain.** It provides `brain-source` for the [strategy-brain](../strategy-brain/README.md), which may hold the next
   game back for a retro window.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewMarket`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([salt-market/tools/viewMarket](prompts/salt-market/tools/viewMarket.md)):

> Look at the market: the rules, the round, your goods, your secret values and contract, every trader's holdings, the open offers you can act on, the deliveries due and your points from earlier games.

### `offer`

- Granted when the game lists no grants: `resident`

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

What the caller reads ([salt-market/tools/offer](prompts/salt-market/tools/offer.md)):

> Make an offer through the bank, to one trader or to all: what you give now (give), what you want now (get), and optionally goods you deliver later by the end of a later round (later, with round, and escrow true to have the bank hold and deliver them for a fee; otherwise it is a promise you keep with give). Counts by good, for example give {"cloth": 2}, get {"spice": 1, "salt": 1}. A counter-offer is a new offer. You must hold what you give now, the tax and the fee; escrowed goods come from your shipment if it arrives by the due round, otherwise you must hold them now. Goods of a shipment still to come can be sold early only this way, or as a plain promise.

### `accept`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The offer's id (for example O3). |

What the caller reads ([salt-market/tools/accept](prompts/salt-market/tools/accept.md)):

> Accept an open offer made to you or to all, by its id. The bank executes it at once if both sides hold what it moves (and the tax); otherwise it refuses.

### `decline`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The offer's id. |
| `note` | string | no | A short note to the proposer. |

What the caller reads ([salt-market/tools/decline](prompts/salt-market/tools/decline.md)):

> Decline an offer made to you, by its id, with an optional short note to the proposer. On an offer to all, decline only tells the proposer that you pass; the offer stays open for the others.

### `withdraw`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `offer` | string | yes | The id of your own open offer. |

What the caller reads ([salt-market/tools/withdraw](prompts/salt-market/tools/withdraw.md)):

> Withdraw one of your own open offers, by its id.

### `give`

- Granted when the game lists no grants: `resident`

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

What the caller reads ([salt-market/tools/give](prompts/salt-market/tools/give.md)):

> Hand goods to another trader for nothing back: to keep a promise (the goods count toward what you owe that trader) or as a side payment.

### `say`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The message. |
| `to` | string | no | One trader for a private message; left out or all: everyone. |

What the caller reads ([salt-market/tools/say](prompts/salt-market/tools/say.md)):

> Send a short message to everyone, or privately to one trader (to). It moves no goods and binds nobody. Limited per round.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `markOwnOffers` | boolean | unset | true: a trader's own offers are marked as its own in the open offers it reads (A46, P478); left out or false: the text of the old platform. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `salt-market.gainOverIdle` | Gain over idle | - | `market_game_scored` |
| `salt-market.efficiency` | Gains from trade realised | - | `market_game_scored` |
| `salt-market.tablePoints` | Table points | points | `market_game_scored` |
| `salt-market.contracts` | Contracts filled | contracts | `market_game_scored` |
| `salt-market.trades` | Trades | trades | `market_game_started`, `market_trade` |
| `salt-market.credit` | Trades with a later delivery | trades | `market_game_started`, `market_trade` |
| `salt-market.brokenPromises` | Promises broken | promises | `market_game_started`, `market_promise_settled` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [salt-market/tools/viewMarket](prompts/salt-market/tools/viewMarket.md) | - |
| [salt-market/tools/offer](prompts/salt-market/tools/offer.md) | - |
| [salt-market/tools/accept](prompts/salt-market/tools/accept.md) | - |
| [salt-market/tools/decline](prompts/salt-market/tools/decline.md) | - |
| [salt-market/tools/withdraw](prompts/salt-market/tools/withdraw.md) | - |
| [salt-market/tools/give](prompts/salt-market/tools/give.md) | - |
| [salt-market/tools/say](prompts/salt-market/tools/say.md) | - |
| [salt-market/rules](prompts/salt-market/rules.md) | `seats`, `games`, `rounds`, `salt`, `saltValue`, `contractBonus`, `taxFree`, `tax`, `escrowFee`, `maxOpenOffers`, `maxSays`, `spoil`, `rotation` |
| [salt-market/game-head](prompts/salt-market/game-head.md) | `game`, `games` |
| [salt-market/round](prompts/salt-market/round.md) | `round`, `rounds`, `spoils`, `goods`, `book`, `shipments`, `offers`, `pledges` |

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: the game `salt-market` comes with its own issue. It will load it as the old
platform did:

```ts
saltMarket({ games, rounds, spoil, roundMinutes: 1 }),
```

with the seven tools granted to every trader, three passes a tick and 12 calls a tick. List it before
`strategy-brain`: its round clock at the end of a tick runs before the brain's retro windows, as on the old platform.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status
says what was true there.

- **P140** an offer to all could not be declined. Fixed: a decline of an offer to all is a pass.
- **P141** the deal was unequal, so the points ranked the deal. Fixed: the deals rotate.
- **P142** salt was too weak a currency. Raised to `saltValue` 2; salt-only bids are still declined. Open.
- **P143** promises and escrow went unused. Fixed: shipments make credit needed.
- **P144, P149** spoilage first barely bit, then was too harsh. Open.
- **P145** the traders are honest. Open.
- **P148** a plain promise due in the round the trader's own shipment lands could not be kept. Fixed: the bank
  refuses it (`TOO_EARLY_FOR_SHIPMENT`).
- **P180** efficiency against the unspoiled start was misleading. Fixed: the reference adds the gain over idle play.
- **P435** no brain effect over 8 paired seeds. Open.

## Tests

[`test/market.test.ts`](test/market.test.ts): the old test's scripted match of four rotated games with a brain per
trader (trades, shipments, escrow from a shipment, kept and broken promises, the spoils, the reference, the
briefing of the next game), the idle match, the mechanic's events of the oracle file
`oracles/salt-market/salt-market-s13-silent.json` byte for byte, `give` against open promises and their settling,
the answer of `viewMarket`, the checks of the package, determinism and snapshot round trips, and a fake run in which
every tool is sampled and accepted. [`test/offers.test.ts`](test/offers.test.ts): refused offers, the tax, escrow at
the trade, declines, passes, withdrawals, expiries and messages. [`test/model.test.ts`](test/model.test.ts): the
deal, rotation, the score, the optimum, fairness and spoilage. [`test/carried.test.ts`](test/carried.test.ts) holds
the prompt files, tools, options, events and audiences to those of the old platform. The game's part of the old
test (the variant names) comes with the game `salt-market`.

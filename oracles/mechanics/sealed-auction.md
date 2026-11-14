# Sealed auction

Solo seats bid on a series of lots, one lot at a time, with sealed bids and a purse of coins per game. Three kinds of
lot measure three classic auction skills against closed-form references: pay-your-bid lots with private values
(shading), pay-the-runner-up lots with private values (truthful bidding) and shared-worth lots where each seat holds
only a noisy estimate (the winner's curse). The framing is neutral; no lot carries a textbook name.

Copied from `mechanics/sealed-auction/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **A game.** `game_started` hands every seat a `purse`; `lots_dealt` deals each lot's private values (between
   `valueMin` and `valueMax`) or its hidden worth (between `worthMin` and `worthMax`) with one estimate per seat,
   off by at most `noise`. Values and estimates are told only to their owner. The kinds come in the order of `lots`.
2. **A lot.** `lot_opened` opens the next lot. Each seat sees its value or estimate, its coins and the earlier results
   with `viewAuction`, and bids once with `bid` (0 passes; a bid must be at least `reserve` and at most the coins
   left). `bid_placed` is sealed until the lot resolves. A seat that has not bid after `deadline` minutes passes.
3. **Resolution.** `lot_resolved` makes every bid public, with the winner and the price: the own bid in a pay-your-bid
   or shared-worth lot, the runner-up's bid (at least `reserve`) in a pay-the-runner-up lot, and a shared lot's
   worth. The winner earns its value (or the worth) minus the price; the price leaves its purse.
4. **Game end.** `game_ended` lists the points; `game_scored` (for the human and the reporter) compares the bids
   with the references: shading against the symmetric equilibrium bid `min + (n-1)/n (v - min)`, truthfulness in
   runner-up lots, and bids above the curse-free ceiling `estimate - noise (n-1)/(n+1)` in shared lots. Unspent
   coins are worth nothing. After `games` games, `match_ended` ends the run.

Between games the mechanic provides `brain-source`, so strategy-brain can open a retro
window per seat. The single-lot references ignore the purse, so a bid held back to save coins for a later lot reads as
underbidding; the reference therefore counts purse-capped bids apart (P160).

## Tools

### `viewAuction`

- Suggested for: `resident`

No parameters.

What the caller reads (sealed-auction/tools/viewAuction):

> Show the auction: the rules, the open lot with your own value or estimate, your coins and points, and the results of this game's lots so far.

### `bid`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Coins bid on the open lot; 0 passes. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (sealed-auction/tools/bid):

> Place your sealed bid on the open lot: a whole number of coins from 0 (pass) to the coins you have left, with a short reason. Nobody sees it until every bid is in. One bid per lot; it cannot be changed.

## Events

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `lots` | ("first-price" or "second-price" or "common")[] | yes |  |
| `purse` | integer | yes |  |
| `seats` | string[] | yes |  |

### `lots_dealt`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `lots` | object[] | yes |  |
| `lots[].number` | integer ≥ 1 | yes |  |
| `lots[].kind` | "first-price" or "second-price" or "common" | yes |  |
| `lots[].values` | record of integer | yes |  |
| `lots[].worth` | integer | no | A common lot's true worth (hidden until it is sold). |

### `lot_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `lot` | integer | yes |  |
| `kind` | "first-price" or "second-price" or "common" | yes |  |

### `bid_placed`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `lot` | integer | yes |  |
| `resident` | string | yes |  |
| `amount` | integer | yes |  |
| `reason` | string | no |  |

### `lot_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `number` | integer | yes |  |
| `kind` | "first-price" or "second-price" or "common" | yes |  |
| `bids` | record of integer | yes |  |
| `winner` | string | no |  |
| `price` | integer | yes |  |
| `profit` | number | yes |  |
| `tie` | boolean | yes |  |
| `missed` | string[] | yes |  |
| `worth` | integer | no |  |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `scores` | record of number | yes |  |
| `totals` | record of number | yes |  |
| `coins` | record of number | yes |  |

### `game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `reference` | object | yes |  |
| `reference.firstPrice` | object | yes |  |
| `reference.secondPrice` | object | yes |  |
| `reference.common` | object | yes |  |
| `reference.revenue` | number | yes | Coins the seller took in the game. |
| `reference.surplus` | number | yes | The bidders' total profit in the game. |
| `reference.unspent` | number | yes | Mean share of the purse left unspent at the end of the game. |
| `reference.missed` | integer | yes |  |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `3` | Games of the match; every game deals fresh lots and a full purse. |
| `lots` | ("first-price" or "second-price" or "common")[] | `["first-price","second-price","common","first-price","common","second-price"]` | The kinds of the lots of each game, in order. |
| `purse` | integer ≥ 1 | `100` | Coins per seat and game. |
| `valueMin` | integer ≥ 0 | `10` |  |
| `valueMax` | integer ≥ 1 | `60` |  |
| `worthMin` | integer ≥ 0 | `20` |  |
| `worthMax` | integer ≥ 1 | `80` |  |
| `noise` | integer ≥ 0 | `15` | The largest error of an estimate of a common lot. |
| `reserve` | integer ≥ 1 | `1` | The least bid that counts, and the least price. |
| `deadline` | integer ≥ 1 | `2` | Minutes a lot stays open before missing bids count as a pass. |



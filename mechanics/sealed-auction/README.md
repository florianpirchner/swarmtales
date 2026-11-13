# sealed-auction

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-sealed-auction` |
| Id | `sealed-auction` |
| Summary | Sealed bids on a series of lots (pay-your-bid, pay-the-runner-up, shared worth) with a purse per game, private values and a winner's-curse reference. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextGame` |
| Stories | [blind-bid](../../stories/blind-bid/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewAuction`

- Suggested for: `resident`

No parameters.

What the caller reads ([sealed-auction/tools/viewAuction](prompts/sealed-auction/tools/viewAuction.md)):

> Show the auction: the rules, the open lot with your own value or estimate, your coins and points, and the results of this game's lots so far.

### `bid`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Coins bid on the open lot; 0 passes. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([sealed-auction/tools/bid](prompts/sealed-auction/tools/bid.md)):

> Place your sealed bid on the open lot: a whole number of coins from 0 (pass) to the coins you have left, with a short reason. Nobody sees it until every bid is in. One bid per lot; it cannot be changed.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [sealed-auction/tools/viewAuction](prompts/sealed-auction/tools/viewAuction.md) | - |
| [sealed-auction/tools/bid](prompts/sealed-auction/tools/bid.md) | - |
| [sealed-auction/game-head](prompts/sealed-auction/game-head.md) | `game`, `games`, `lots` |
| [sealed-auction/rules](prompts/sealed-auction/rules.md) | `purse`, `lots`, `reserve`, `valueMin`, `valueMax`, `worthMin`, `worthMax`, `noise` |
| [sealed-auction/task-first-price](prompts/sealed-auction/task-first-price.md) | `lot`, `lots`, `value`, `coins` |
| [sealed-auction/task-second-price](prompts/sealed-auction/task-second-price.md) | `lot`, `lots`, `value`, `coins` |
| [sealed-auction/task-common](prompts/sealed-auction/task-common.md) | `lot`, `lots`, `estimate`, `coins`, `noise` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

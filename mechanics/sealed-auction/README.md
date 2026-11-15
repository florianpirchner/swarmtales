# Sealed auction

Solo seats bid on a series of lots, one lot at a time, with sealed bids and a purse of coins per game. Three kinds of
lot measure three classic auction skills against closed-form references: pay-your-bid lots with private values
(shading), pay-the-runner-up lots with private values (truthful bidding) and shared-worth lots where each seat holds
only a noisy estimate (the winner's curse). The framing is neutral; no lot carries a textbook name.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-sealed-auction` |
| Id | `sealed-auction` |
| Summary | Sealed bids on a series of lots (pay-your-bid, pay-the-runner-up, shared worth) with a purse per game, private values and a winner's-curse reference. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [blind-bid](../../games/blind-bid/README.md) |

<!-- /generated:glance -->

## How it plays

1. **A game.** `game_started` hands every seat a `purse`; `lots_dealt` deals each lot's private values (between
   `valueMin` and `valueMax`) or its hidden worth (between `worthMin` and `worthMax`) with one estimate per seat,
   off by at most `noise` (seeded, one stream per game; for the human only). Values and estimates are told only to
   their owner. The kinds come in the order of `lots`.
2. **A lot.** `lot_opened` opens the next lot. Each seat sees its value or estimate, its coins and the earlier results
   with `viewAuction`, and bids once with `bid` (0 passes; a bid must be at least `reserve` to count and at most the
   coins left). `bid` is open only for a seat that owes a bid on the open lot; a game locks it at its start
   (`locked: ["bid"]`). `bid_placed` is sealed (for the human only) until the lot resolves. A seat that has not bid
   within `deadline` ticks passes.
3. **Resolution.** `lot_resolved` makes every bid public, with the winner and the price: the own bid in a pay-your-bid
   or shared-worth lot, the runner-up's bid (at least `reserve`) in a pay-the-runner-up lot, and a shared lot's
   worth. Ties are drawn from a seeded stream per lot. The winner earns its value (or the worth) minus the price; the
   price leaves its purse.
4. **Game end.** `game_ended` lists the points; `game_scored` (for the human and the reporter) compares the bids
   with the references: shading against the symmetric equilibrium bid `min + (n-1)/n (v - min)`, truthfulness in
   runner-up lots, and bids above the curse-free ceiling `estimate - noise (n-1)/(n+1)` in shared lots. Unspent
   coins are worth nothing. After `games` games, `match_ended` ends the run (the limit `match`).
5. **News.** Only a seat that owes a bid on the open lot has news; it is told the game's rules once per game, and the
   last result and its task once per lot.

Between games the mechanic provides `brain-source`, so [strategy-brain](../strategy-brain/README.md) can open a retro
window per seat and hold the next game back. The single-lot references ignore the purse, so a bid held back to save
coins for a later lot reads as underbidding; the reference therefore counts purse-capped bids apart (P160).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewAuction`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([sealed-auction/tools/viewAuction](prompts/sealed-auction/tools/viewAuction.md)):

> Show the auction: the rules, the open lot with your own value or estimate, your coins and points, and the results of this game's lots so far.

### `bid`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Coins bid on the open lot; 0 passes. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([sealed-auction/tools/bid](prompts/sealed-auction/tools/bid.md)):

> Place your sealed bid on the open lot: a whole number of coins from 0 (pass) to the coins you have left, with a short reason. Nobody sees it until every bid is in. One bid per lot; it cannot be changed.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

The four ranges `valueMin`, `valueMax`, `worthMin` and `worthMax` carry no description on the old platform; the port
keeps their schemas as they are.

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
| `sealed-auction.shading` | Bid over value, pay-your-bid | - | `game_scored` |
| `sealed-auction.truthfulness` | Truthfulness, pay-the-runner-up | - | `game_scored` |
| `sealed-auction.bidToEstimate` | Bid over estimate, shared worth | - | `game_scored` |
| `sealed-auction.cursed` | Shared-worth lots sold at a loss | lots | `game_scored` |
| `sealed-auction.unspent` | Purse left unspent | - | `game_scored` |
| `sealed-auction.missed` | Bids missed | bids | `game_scored` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

No game of this repository loads it yet: the game `blind-bid` comes with its own issue. It will load it as the old
platform did:

```ts
sealedAuction({ games, lots: [...lots], purse, deadline: DEADLINE }),
```

Four seats play three games of six lots (two of each kind) with a purse of 100 coins and two ticks per lot.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status
says what was true there.

- **P92, P161** neutral framing and neutral names do not hide auction theory. Open.
- **P160** the purse read as underbidding: purse-capped bids counted as untruthful. Fixed (capped bids counted apart).
- **P162** shared lots are over-shaded and the curse is small. Open.
- **P163** the purse binds unevenly. Open.

## Tests

[`test/sealed-auction.test.ts`](test/sealed-auction.test.ts): a scripted match of three games (sealed deals and bids,
a public result per lot, no bid above the purse, the worth shown once a shared lot is sold), private values told only
to their owner, missed bids as passes, `bid` open only while a lot waits for the seat with a bid above the coins
refused, a fake run in which every tool is sampled and accepted, the package and the options, determinism and
snapshots between games and inside a game. [`test/rules.test.ts`](test/rules.test.ts): the deal, the price rules, the
curse and the reference scores (the rule cases of the old test). [`test/oracle.test.ts`](test/oracle.test.ts): the
mechanic's events are those of the oracle files `blind-bid-s13-silent.json` (nobody bids) and
`blind-bid-nobrain-s7.json` (the scripted bidders), byte for byte. [`test/carried.test.ts`](test/carried.test.ts)
holds the prompt files, the tools, options, events, state and audiences to those of the old platform. The game's part
of the old test (the brain, the briefings, the variant names) comes with the game `blind-bid`.

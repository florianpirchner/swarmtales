# Sealed auction

Solo seats bid on a series of lots, one lot at a time, with sealed bids and a purse of coins per game. Three kinds of
lot measure three classic auction skills against closed-form references: pay-your-bid lots with private values
(shading), pay-the-runner-up lots with private values (truthful bidding) and shared-worth lots where each seat holds
only a noisy estimate (the winner's curse). The framing is neutral; no lot carries a textbook name.

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

Between games the mechanic provides `brain-source`, so [strategy-brain](../strategy-brain/README.md) can open a retro
window per seat. The single-lot references ignore the purse, so a bid held back to save coins for a later lot reads as
underbidding; the reference therefore counts purse-capped bids apart (P160).

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

From `stories/blind-bid/story.ts`:

```ts
mechanics: [
	sealedAuction.with({ games, lots: [...lots], purse, deadline: DEADLINE }),
	strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
],
```

Four seats play three games of six lots (two of each kind) with a purse of 100 coins and two minutes per lot.

## Lessons and loopholes

See the log in [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md).

| ID | What happened | Status |
| --- | --- | --- |
| P92 | Neutral framing does not hide the games. | open |
| P160 | The purse read as underbidding: purse-capped bids counted as untruthful. | fixed (capped bids counted apart) |
| P161 | Neutral names do not hide auction theory. | open |
| P162 | Shared lots are over-shaded and the curse is small. | open |
| P163 | The purse binds unevenly. | open |

## Tests

The rules and the scripted match live in `test/stories/blind-bid.test.ts`: the deal of private values and estimates
inside the noise, the price rules of pay-your-bid and pay-the-runner-up lots, the curse on a shared lot, the shading and
truthfulness scores, a scripted three-game match with a public result per lot and a brain per seat, private values
told only to their owner, missed bids as passes, bids refused outside a waiting lot or above the coins, the registered
variants, determinism and a snapshot round trip inside a game and inside a retro window.

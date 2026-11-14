# Hold'em

Fixed-limit Texas Hold'em for solo seats, heads-up or at a full table. A match is several games of several hands;
with duplicate deals every seat plays every position's cards once, so the luck of the deal cancels out of the match
totals. Every decision is scored for the human against a simple equity baseline; the seats never see it.

Copied from `mechanics/holdem/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Hands.** The button moves one seat per hand; blinds `smallBlind` and `bigBlind`; bets of `smallBet` before and on
   the flop, `bigBet` on the turn and river, at most `cap` bets per betting round. There are no stacks (the cap bounds
   a hand), so no all-in and no side pot.
2. **Seeing and acting.** A seat sees only its own cards (`viewTable` and its turn lines); `cards_dealt` with every hole
   card is for the human. On its turn a seat calls `act` (fold, check, call, bet or raise) with an optional reason that
   stays in the log for the human, so a bluff stays a bluff. With `showBest` the seat is told the best hand it holds now
   in words. A seat that does not act within `deadline` minutes checks, or folds when it faces a bet.
3. **Duplicate.** With `duplicate` every game replays the same deals with the seats moved one place; over as many games
   as there are seats, every seat has played every position.
4. **Scoring for the human.** Every decision is scored against a Monte Carlo equity against the opponents' ranges as
   their actions narrow them, and the pot odds, one street ahead (not a solver; `equitySamples` draws). The equity
   against random hands is recorded beside it (`decision_scored`). Each game ends with `game_scored`: net points, VPIP,
   PFR, aggression, agreement with the baseline, EV loss.
5. **Aid.** With `aid` (or for `aidSeats` only, a mixed table) the seat to act is told its equity and the pot odds it
   needs, at decision time.
6. **Brain.** It provides `brain-source` for the strategy-brain; every game starts from
   a fresh context.

## Tools

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads (holdem/tools/viewTable):

> Look at the table: your cards, the board, the pot, what you may do now, this hand's actions so far, the results of this game's earlier hands and the points.

### `act`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | "fold" or "check" or "call" or "bet" or "raise" | yes |  |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads (holdem/tools/act):

> Your action when it is your turn: fold (give up the hand), check (nothing to call), call (match the current bet), bet or raise (one more bet of the street's fixed size). Only the player to act, once per turn.

## Events

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hands` | integer | yes |  |
| `seats` | string[] | yes |  |

### `hand_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `button` | string | yes |  |
| `seats` | string[] | yes |  |

### `cards_dealt`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `holes` | record of string[] | yes |  |
| `runout` | string[] | yes |  |

### `action_taken`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `seat` | string | yes |  |
| `done` | "small blind" or "big blind" or "fold" or "check" or "call" or "bet" or "raise" | yes |  |
| `to` | number | yes |  |
| `street` | "preflop" or "flop" or "turn" or "river" | yes |  |
| `pot` | number | yes |  |
| `missed` | boolean | no |  |

### `board_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `street` | "preflop" or "flop" or "turn" or "river" | yes |  |
| `cards` | string[] | yes |  |

### `decision_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `street` | "preflop" or "flop" or "turn" or "river" | yes |  |
| `resident` | string | yes |  |
| `done` | "fold" or "check" or "call" or "bet" or "raise" | yes |  |
| `toCall` | number | yes |  |
| `pot` | number | yes | The pot before the decision. |
| `opponents` | integer | yes |  |
| `equity` | number | yes | Monte Carlo share of the pot against random hands of the opponents still in. |
| `rangeEquity` | number | yes | The same against hands drawn from each opponent's range as its actions narrow it (`rangesOf`); the baseline and the EV loss use it (P134). |
| `potOdds` | number | yes | toCall / (pot + toCall): the equity a call needs to break even on this street. |
| `baseline` | "fold" or "check" or "call" or "bet" or "raise" | yes |  |
| `evLoss` | number | yes | One-street EV the decision gave up against the baseline's (folding equity, or calling without odds); 0 when it agrees in kind. |
| `missed` | boolean | yes |  |
| `reason` | string | no |  |

### `hand_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hand` | integer | yes |  |
| `button` | string | yes |  |
| `pot` | number | yes |  |
| `board` | string[] | yes |  |
| `shown` | object[] | yes |  |
| `shown[].seat` | string | yes |  |
| `shown[].cards` | string[] | yes |  |
| `shown[].best` | string | yes |  |
| `winners` | string[] | yes |  |
| `net` | record of number | yes |  |
| `street` | "preflop" or "flop" or "turn" or "river" | yes |  |
| `showdown` | boolean | yes |  |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `scores` | record of number | yes |  |
| `totals` | record of number | yes |  |

### `game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stats` | record of object | yes |  |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `4` | Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context. |
| `hands` | integer ≥ 1 ≤ 100 | `8` | Hands per game; the button moves one seat per hand. |
| `smallBlind` | integer ≥ 0 | `1` |  |
| `bigBlind` | integer ≥ 1 | `2` |  |
| `smallBet` | integer ≥ 1 | `2` | The bet size before the flop and on the flop. |
| `bigBet` | integer ≥ 1 | `4` | The bet size on the turn and the river. |
| `cap` | integer ≥ 1 ≤ 10 | `4` | Bets per betting round, the opening bet (preflop: the big blind) included. |
| `duplicate` | boolean | `true` | Every game replays the same deals with the seats moved one place (luck cancels over as many games as seats); false deals fresh cards in every game. |
| `deadline` | integer ≥ 1 | `2` | Minutes the seat to act has before it checks, or folds when facing a bet. |
| `equitySamples` | integer ≥ 1 ≤ 5000 | `400` | Monte Carlo draws per scored decision. |
| `showBest` | boolean | `true` | Tell a seat on its turn the best hand it holds now, in words (reading the board is not what the game measures). |
| `aid` | boolean | `false` | Decision-time aid: tell the seat to act its equity against the opponents' action-narrowed ranges and the pot odds it needs to call, the referee's own reference (P430). |
| `aidSeats` | string[] | unset | With `aid`: only these seats get the aid line (a mixed table); default every seat. |



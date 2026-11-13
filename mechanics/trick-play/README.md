# trick-play

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-trick-play` |
| Id | `trick-play` |
| Summary | A trick-taking game with exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring. |
| Requires | `card-table` (from [card-table](../card-table/README.md)) |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `trick-play`, `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `actor`, `totals`, `wins` |
| Jobs | `nextGame` |
| Stories | [ember-tricks](../../stories/ember-tricks/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewTable`

- Suggested for: `resident`
- Free: does not count as a step

No parameters.

What the caller reads ([trick-play/tools/viewTable](prompts/trick-play/tools/viewTable.md)):

> Look at the table: your own hand, the round and its card count, every bid so far, the trump, the trick on the table, the tricks of this round, the scores, the veto tokens left and what you may do now. It costs no step. When it is not your turn it only says whose turn it is.

### `placeBid`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tricks` | integer ≥ 0 | yes | The exact number of tricks you will take this round. |

What the caller reads ([trick-play/tools/placeBid](prompts/trick-play/tools/placeBid.md)):

> Bid how many tricks you will take in this round, exactly (0 up to the cards each seat holds). Only when it is your turn to bid; a bid cannot be changed.

### `nameTrump`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `suit` | string | yes | The suit's name, for example "Ember". |

What the caller reads ([trick-play/tools/nameTrump](prompts/trick-play/tools/nameTrump.md)):

> Name the trump suit for this round. Only the seat with the lowest bid may, once every bid is public.

### `playCard`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | string | yes | The card, suit and rank, for example "Ember 7". |

What the caller reads ([trick-play/tools/playCard](prompts/trick-play/tools/playCard.md)):

> Play a card from your hand to the trick, for example "Ember 7". Only on your turn. You must follow the suit led when you can.

### `vetoLead`

- Suggested for: `resident`

No parameters.

What the caller reads ([trick-play/tools/vetoLead](prompts/trick-play/tools/vetoLead.md)):

> Spend your veto token (one per game) right after the lead card of a trick, before you play: the lead card goes back to the leader, who must lead a different suit. Only the seat after the leader may, and only when the leader holds another suit.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `seats` | string[] | yes |  |
| `startingSide` | string | yes | The seat that bids and leads first in the game's first round. |

### `round_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes | The round of the game, from 1. |
| `cards` | integer | yes | Cards dealt to each seat. |
| `dealer` | string | yes |  |
| `order` | string[] | yes | Bidding order; the first seat also leads the first trick. |

### `bid_placed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `bid` | integer | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `trump_named`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `suit` | string | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `lead_vetoed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes | Who spent the veto token. |
| `leader` | string | yes |  |
| `suit` | string | yes |  |

### `card_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes |  |
| `card` | string | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `trick_won`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes |  |
| `plays` | object[] | yes |  |
| `plays[].seat` | string | yes |  |
| `plays[].card` | string | yes |  |

### `round_scored`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trump` | string or null | yes |  |
| `bids` | record of integer | yes |  |
| `tricks` | record of integer | yes |  |
| `points` | record of integer | yes |  |
| `totals` | record of integer | yes |  |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `result` | string | yes | The seat with the most points; several joined by '+' on a tie. |
| `totals` | record of integer | yes |  |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `wins` | record of integer | yes |  |
| `points` | record of integer | yes | Every seat's points summed over the match's games. |
| `invalid` | boolean | no | True when the match was ended as invalid (too many forfeits in a row); no result. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 | `3` | Games in the match; the run ends after the last one. |
| `rounds` | (integer ≥ 1)[] | `[1,2,3,4,5,6,7,8]` | Cards dealt to each seat, round by round; a game has one round per entry. |
| `trump` | "lowestBidderNames" or "none" | `"lowestBidderNames"` | lowestBidderNames: the lowest bidder names the trump suit once every bid is public; none: no trump. |
| `vetoTokens` | integer ≥ 0 | `1` | Veto tokens each seat gets per game (0: no veto). |
| `scoring` | object | `{"hit":10,"perTrick":3,"miss":"square"}` | Points of a round: hit plus perTrick per trick on a hit; a miss costs missBase plus the error squared (or 10 per trick off). |
| `scoring.hit` | integer | `10` | Points for taking exactly the tricks bid. |
| `scoring.perTrick` | integer | `3` | Points per trick taken, on a hit only. |
| `scoring.miss` | "square" or "linear" | `"square"` | A miss costs the square of the error (square) or 10 per trick off (linear), plus missBase. |
| `scoring.missBase` | integer ≥ 0 | unset | A fixed cost of every miss on top of the error term (default 0). |
| `maxIdleMinutes` | integer ≥ 1 | `3` | Whole minutes a seat may leave its action open before the move timer acts for it. |
| `maxConsecutiveForfeits` | integer ≥ 0 | `0` | That many timer actions in a row end the match as invalid (0: off). |
| `briefEveryRound` | boolean | `false` | Tell a strategy brain of every round's start, not only the game's, so every round begins from a fresh context with the briefing. |
| `bidSum` | boolean | `false` | The table shows the sum of the bids placed so far against the tricks of the round. |
| `calibration` | boolean | `false` | The end-of-game record tells each seat its own calibration: tricks bid against tricks taken, hits, zero bids. |
| `reference` | "off" or "retro" or "bid" | `"off"` | A Monte Carlo worth of each hand at bidding time (random unseen cards and trump, a simple play policy): retro adds the seat's own total to the calibration line, bid shows the seat its hand's worth while it bids. |
| `referenceSamples` | integer ≥ 1 | `200` | Random deals per hand for the reference worth. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `trick-play`

The trick game: the running game and round, the phase, who acts and the public table.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `round` | query | - | integer | The running (or last) round of the game, from 1. |
| `phase` | query | - | "idle" or "bid" or "trump" or "play" | idle (between rounds or games), bid, trump or play. |
| `actor` | query | - | string or null | The seat that must act now, or null. |
| `table` | query | - | object | The public table: bids so far, the trump, the plays of the trick on the table and the tricks won this round. |

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
| [trick-play/tools/viewTable](prompts/trick-play/tools/viewTable.md) | - |
| [trick-play/tools/placeBid](prompts/trick-play/tools/placeBid.md) | - |
| [trick-play/tools/nameTrump](prompts/trick-play/tools/nameTrump.md) | - |
| [trick-play/tools/playCard](prompts/trick-play/tools/playCard.md) | - |
| [trick-play/tools/vetoLead](prompts/trick-play/tools/vetoLead.md) | - |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

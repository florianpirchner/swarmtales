# liars-dice

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-liars-dice` |
| Id | `liars-dice` |
| Summary | Liar's dice for solo seats: secret seeded rolls, escalating bids checked by the engine, liar calls that reveal every die, a probability baseline for the report. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextGame` |
| Stories | [liars-dice](../../stories/liars-dice/README.md) (all 3 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads ([liars-dice/tools/viewTable](prompts/liars-dice/tools/viewTable.md)):

> Look at the table: the rules, the dice each seat has, this round's bids so far, your own dice, whose turn it is and the points.

### `bid`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `quantity` | integer ≥ 1 ≤ 80 | yes | How many dice on the whole table (at least) show the face. |
| `face` | integer ≥ 1 ≤ 12 | yes | The face. |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads ([liars-dice/tools/bid](prompts/liars-dice/tools/bid.md)):

> Bid that at least `quantity` dice on the whole table (all seats, yours included) show `face`. It must beat the standing bid: more dice, or as many dice on a higher face. Only on your turn. Add a short private reason, and optionally a public remark (say) the whole table reads.

### `liar`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads ([liars-dice/tools/liar](prompts/liars-dice/tools/liar.md)):

> Call the standing bid a lie. Every die is shown: if the table holds fewer dice of the bid's face than it claims, the bidder loses a die; otherwise you lose one. Only on your turn, once a bid stands. Add a short private reason, and optionally a public remark (say).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `dice_game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seats` | string[] | yes |  |
| `dice` | integer | yes |  |

### `dice_rolled`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `dice` | record of integer[] | yes |  |

### `dice_round_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `starter` | string | yes |  |
| `counts` | record of integer | yes |  |

### `dice_bid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `quantity` | integer | yes |  |
| `face` | integer | yes |  |
| `say` | string | no |  |
| `missed` | boolean | no |  |

### `dice_called`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `bidder` | string | yes |  |
| `bid` | object | yes |  |
| `bid.quantity` | integer ≥ 1 | yes |  |
| `bid.face` | integer ≥ 1 | yes |  |
| `count` | integer | yes |  |
| `dice` | record of integer[] | yes |  |
| `loser` | string | yes |  |
| `say` | string | no |  |
| `missed` | boolean | no |  |

### `dice_seat_out`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seat` | string | yes |  |
| `place` | integer | yes |  |

### `dice_decision_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `resident` | string | yes |  |
| `kind` | "bid" or "liar" | yes |  |
| `bid` | object | no |  |
| `bid.quantity` | integer ≥ 1 | yes |  |
| `bid.face` | integer ≥ 1 | yes |  |
| `standing` | object | no |  |
| `standing.quantity` | integer ≥ 1 | yes |  |
| `standing.face` | integer ≥ 1 | yes |  |
| `dice` | integer[] | yes | The seat's own dice. |
| `unseen` | integer | yes | Dice on the table the seat cannot see. |
| `truth` | number | yes | For a bid: the chance it is true from the seat's own dice. For liar: the chance the standing bid is false. |
| `standingTruth` | number | no | The chance the standing bid was true from the seat's own dice. |
| `baseline` | "bid" or "liar" | yes |  |
| `baselineBid` | object | no |  |
| `baselineBid.quantity` | integer ≥ 1 | yes |  |
| `baselineBid.face` | integer ≥ 1 | yes |  |
| `agree` | boolean | yes | Same kind of decision as the baseline (bid or liar). |
| `bluff` | boolean | yes | A bid the seat's own dice make less likely true than not. |
| `missed` | boolean | yes |  |
| `reason` | string | no |  |

### `dice_game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `places` | record of integer | yes |  |
| `points` | record of number | yes |  |
| `totals` | record of number | yes |  |

### `dice_game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `stats` | record of object | yes |  |

### `dice_match_ended`

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
| `games` | integer ≥ 1 ≤ 20 | `3` | Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context. |
| `dice` | integer ≥ 1 ≤ 10 | `4` | Dice every seat starts a game with. |
| `faces` | integer ≥ 2 ≤ 12 | `6` | Faces of a die. |
| `wildOnes` | boolean | `true` | Ones count for every face and cannot be bid on. |
| `placePoints` | number[] | `[3,2,1,0]` | Points for the first, second, ... place of a game (the winner first, the first seat out last); missing places score 0. |
| `talk` | boolean | `true` | A bid or a call may carry a short public remark (table talk). |
| `deadline` | integer ≥ 1 | `2` | Minutes the seat to act has before it calls liar, or opens with the lowest bid. |

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
| [liars-dice/tools/viewTable](prompts/liars-dice/tools/viewTable.md) | - |
| [liars-dice/tools/bid](prompts/liars-dice/tools/bid.md) | - |
| [liars-dice/tools/liar](prompts/liars-dice/tools/liar.md) | - |
| [liars-dice/rules](prompts/liars-dice/rules.md) | `seats`, `dice`, `faces`, `wild`, `lowest`, `places`, `talk` |
| [liars-dice/game-head](prompts/liars-dice/game-head.md) | `game`, `games` |
| [liars-dice/task](prompts/liars-dice/task.md) | `round`, `dice`, `total`, `standing`, `choices` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

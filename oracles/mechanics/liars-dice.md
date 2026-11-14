# Liar's dice

The bluffing game with hidden dice, for solo seats. Each round every seat rolls its dice in secret; in turn, a seat
either bids higher ("at least four fives on the whole table") or calls the last bid a lie. A call reveals every die and
the loser of the call loses a die; the last seat with dice wins the game.

Copied from `mechanics/liars-dice/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **A game.** Every seat starts with `dice` dice of `faces` faces. Each round the seats still in roll in secret
   (seeded; `dice_rolled` is for the human only).
2. **Bids.** In table order a seat either `bid`s a quantity and face that beats the standing bid and fits on the table
   (`dice_bid`), or calls `liar` on the last bid (`dice_called`). With `wildOnes` ones count for every face and cannot
   be bid on. A bid or call may carry a short public remark (`say`, table talk; off with `talk: false`). The reason a
   seat gives stays for the human, so a bluff stays a bluff.
3. **The call.** Every die is revealed. If the table holds at least the bid's quantity of its face, the caller loses a
   die, else the bidder does. The loser opens the next round (or the next seat still in). A seat without dice is out
   (`dice_seat_out`); the last seat with dice wins. Places score `placePoints` (default 3, 2, 1, 0).
4. **The clock.** A seat that does not act within `deadline` minutes calls liar, or opens with the lowest bid.
5. **Scoring for the human.** Every decision is scored against a simple probability baseline (the seat's own dice,
   every other die fair and unknown; it reads nothing into the bids) in `dice_decision_scored`; every game ends with
   `dice_game_scored` (bluffs, calls won, agreement).
6. **Brain.** It provides `brain-source` for the strategy-brain.

## Tools

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads (liars-dice/tools/viewTable):

> Look at the table: the rules, the dice each seat has, this round's bids so far, your own dice, whose turn it is and the points.

### `bid`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `quantity` | integer ≥ 1 ≤ 80 | yes | How many dice on the whole table (at least) show the face. |
| `face` | integer ≥ 1 ≤ 12 | yes | The face. |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads (liars-dice/tools/bid):

> Bid that at least `quantity` dice on the whole table (all seats, yours included) show `face`. It must beat the standing bid: more dice, or as many dice on a higher face. Only on your turn. Add a short private reason, and optionally a public remark (say) the whole table reads.

### `liar`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads (liars-dice/tools/liar):

> Call the standing bid a lie. Every die is shown: if the table holds fewer dice of the bid's face than it claims, the bidder loses a die; otherwise you lose one. Only on your turn, once a bid stands. Add a short private reason, and optionally a public remark (say).

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `3` | Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context. |
| `dice` | integer ≥ 1 ≤ 10 | `4` | Dice every seat starts a game with. |
| `faces` | integer ≥ 2 ≤ 12 | `6` | Faces of a die. |
| `wildOnes` | boolean | `true` | Ones count for every face and cannot be bid on. |
| `placePoints` | number[] | `[3,2,1,0]` | Points for the first, second, ... place of a game (the winner first, the first seat out last); missing places score 0. |
| `talk` | boolean | `true` | A bid or a call may carry a short public remark (table talk). |
| `deadline` | integer ≥ 1 | `2` | Minutes the seat to act has before it calls liar, or opens with the lowest bid. |



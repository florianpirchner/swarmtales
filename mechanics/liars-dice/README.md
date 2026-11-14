# Liar's dice

The bluffing game with hidden dice, for solo seats. Each round every seat rolls its dice in secret; in turn, a seat
either bids higher ("at least four fives on the whole table") or calls the last bid a lie. A call reveals every die and
the loser of the call loses a die; the last seat with dice wins the game.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-liars-dice` |
| Id | `liars-dice` |
| Summary | Liar's dice for solo seats: secret seeded rolls, escalating bids checked by the engine, liar calls that reveal every die, a probability baseline for the report. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [liars-dice](../../games/liars-dice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **A game.** Every seat starts with `dice` dice of `faces` faces. Each round the seats still in roll in secret
   (seeded, one stream per round; `dice_rolled` is for the human only). Round 1 of game `g` is opened one seat further
   round the table than in the game before.
2. **Bids.** In table order a seat either makes a `bid` (a quantity and a face) that beats the standing bid and fits
   on the table (`dice_bid`), or calls `liar` on the last bid (`dice_called`). With `wildOnes` ones count for every face
   and cannot be bid on. A bid or call may carry a short public remark (`say`, table talk; off with `talk: false`). The
   reason a seat gives stays for the human, so a bluff stays a bluff.
3. **The call.** Every die is revealed. If the table holds at least the bid's quantity of its face, the caller loses a
   die, else the bidder does. The loser opens the next round (or the next seat still in). A seat without dice is out
   (`dice_seat_out`); the last seat with dice wins. Places score `placePoints` (default 3, 2, 1, 0).
4. **The turn.** `bid` and `liar` are open for the seat to act only (`liar` once a bid stands); a game locks both at its
   start (`locked: ["bid", "liar"]`). A bid or a call ends the caller's activation unless it is to act again. Only the
   seat to act has news; it is told its dice, the standing bid and its choices once per turn.
5. **The clock.** A seat that does not act within `deadline` ticks calls liar, or opens with the lowest bid (`missed`).
6. **Scoring for the human.** Every decision is scored against a simple probability baseline (the seat's own dice,
   every other die fair and unknown; it reads nothing into the bids) in `dice_decision_scored`; every game ends with
   `dice_game_scored` (bluffs, calls won, agreement).
7. **Brain.** It provides `brain-source` for the [strategy-brain](../strategy-brain/README.md), which may hold the next
   game back for a retro window.

The pure rules (bid order, counting, the chance a bid is true, the baseline, the seat statistics) are the sub-path
`@swarmtales/mechanic-liars-dice/rules`.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewTable`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([liars-dice/tools/viewTable](prompts/liars-dice/tools/viewTable.md)):

> Look at the table: the rules, the dice each seat has, this round's bids so far, your own dice, whose turn it is and the points.

### `bid`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `quantity` | integer ≥ 1 ≤ 80 | yes | How many dice on the whole table (at least) show the face. |
| `face` | integer ≥ 1 ≤ 12 | yes | The face. |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads ([liars-dice/tools/bid](prompts/liars-dice/tools/bid.md)):

> Bid that at least `quantity` dice on the whole table (all seats, yours included) show `face`. It must beat the standing bid: more dice, or as many dice on a higher face. Only on your turn. Add a short private reason, and optionally a public remark (say) the whole table reads.

### `liar`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `say` | string | no | Optional table talk: a short remark every seat reads (true or not). |
| `reason` | string | no | A short reason, for the record (never shown to the other players). |

What the caller reads ([liars-dice/tools/liar](prompts/liars-dice/tools/liar.md)):

> Call the standing bid a lie. Every die is shown: if the table holds fewer dice of the bid's face than it claims, the bidder loses a die; otherwise you lose one. Only on your turn, once a bid stands. Add a short private reason, and optionally a public remark (say).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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

No game of this repository loads it yet: the game `liars-dice` comes with its own issue. It will load it as the old
platform did:

```ts
liarsDice({ games, dice, talk, placePoints, deadline: DEADLINE }),
```

`placePoints` has one entry per seat there (`seats - 1` down to 0), and the decision tools are locked at the start.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P280, P281** table talk is honest self-disclosure; no deliberate bluff by Haiku. Open.
- **P282, P422** the own-dice baseline overrates liar calls and calls a read a bluff. Open.
- **P283** out-of-turn tries. Fixed, to be measured.
- **P284** the brain's word cap is overrun again. Open.
- **P420, P421, P424** Opus dominates a Haiku table without lying; Sonnet plays worse than Haiku; Opus does not bluff
  at a table of readers either. Open.
- **P423** the game rewards bluffing only against readers. Open.

## Tests

[`test/liars-dice.test.ts`](test/liars-dice.test.ts): a scripted match of three games (secret rolls, a reason that
never reaches a public event, calls that show the roll, places and points), the clock for seats that never act, the
tools open only for the seat to act with refused bids, a fake run in which every tool is sampled and accepted,
documented options, determinism and snapshots inside a game. [`test/rules.test.ts`](test/rules.test.ts): the bid
order, wild ones, the chance a bid is true, the baseline, the next live seat.
[`test/oracle.test.ts`](test/oracle.test.ts): the mechanic's events of a run in which nobody acts are those of the
oracle file `liars-dice-g1-s13-silent.json`. [`test/carried.test.ts`](test/carried.test.ts) holds the prompt files,
tools, options, events and audiences to those of the old platform. The game's part of the old test (the brain, the
briefings, the variant names) comes with the game `liars-dice`.

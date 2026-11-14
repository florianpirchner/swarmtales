# Draft rounds

A drafting game (the game of Quarry) for solo seats. In each pack round every seat opens a pack, keeps one card and
passes the rest on, until the packs are empty; then each quarry scores the square of each resource it collected, a
bonus for the single biggest holder of a resource, and a place bonus. A seat may also burn a card to deny it to the
next seat.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-draft-rounds` |
| Id | `draft-rounds` |
| Summary | The drafting game Quarry for solo seats: packs passed around a table, one sealed pick each, quarries of four resources scored at the end of a game. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [quarry](../../games/quarry/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Cards.** Four resources (amber, basalt, cobalt, jade) and a wild ore (lodestone, `wilds` per game).
2. **Pack rounds.** A game has `packs` pack rounds of `packSize` cards. Every seat opens a pack (`draft_pick_opened`),
   keeps one card with `pick` and passes the rest: to the next seat in odd rounds, to the previous one in even rounds.
   Picks are simultaneous and sealed (`draft_card_picked`, for the human only). With a pick a seat may also burn one
   more card of the pack (`maxBurns` per game, `burnCost` points each). A pick not made within `deadline` ticks takes
   the first card and is marked missed.
3. **What a seat sees.** `viewTable` shows its own pack, its quarry and who passed the pack to it. Other quarries are
   revealed at the game's end (`openHands` shows them all along).
4. **Scoring.** Each resource scores the square of its cards; a set takes at most one lodestone and the lodestones go
   to the biggest sets. The single seat with the most cards of a resource gets `majorityBonus` (a tie scores nothing,
   so a hate pick can cost a neighbour its bonus). `placeBonus` pays the first, second ... place of the game
   (`draft_game_ended`).
5. **Reference.** Every pick is scored against the greedy pick (what it added against the best card, and whether it
   took the receiver's best card), and each game against a greedy table on the same deal (`draft_game_scored`, for the
   human only). It provides `brain-source` for the [strategy-brain](../strategy-brain/README.md).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewTable`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([draft-rounds/tools/viewTable](prompts/draft-rounds/tools/viewTable.md)):

> Look at the table: the rules, the pack in front of you, your quarry, your burns left and your points from earlier games.

### `pick`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | string | yes | The id of the card you keep (for example A3). |
| `burn` | string | no | Optional: the id of a second card of the pack to destroy before the pack moves on (limited per game). |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([draft-rounds/tools/pick](prompts/draft-rounds/tools/pick.md)):

> Keep one card of the pack in front of you (card, by its id) with a short reason; the rest moves on to the next seat. Optionally burn a second card of the pack (burn, by its id) to destroy it before the pack moves on: limited per game, and it may cost points (the rules say how many). Sealed: nobody sees your pick until the game ends. Once per pick, only while you hold a pack.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `draft_game_started`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `seats` | string[] | yes |  |
| `deck` | object[] | yes | The deck in deal order (sealed: audience human). |
| `deck[].id` | string | yes |  |
| `deck[].kind` | "amber" or "basalt" or "cobalt" or "jade" or "lodestone" | yes |  |

### `draft_pick_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `pack` | integer | yes |  |
| `step` | integer | yes |  |
| `sizes` | record of integer | yes | Cards in front of each seat. |

### `draft_card_picked`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `pack` | integer | yes |  |
| `step` | integer | yes |  |
| `resident` | string | yes |  |
| `card` | object | yes |  |
| `card.id` | string | yes |  |
| `card.kind` | "amber" or "basalt" or "cobalt" or "jade" or "lodestone" | yes |  |
| `burned` | object | no |  |
| `burned.id` | string | yes |  |
| `burned.kind` | "amber" or "basalt" or "cobalt" or "jade" or "lodestone" | yes |  |
| `packSize` | integer | yes | Cards in the pack before the pick. |
| `gain` | number | yes | What the card added to the own set score. |
| `best` | number | yes | The most any card of the pack would have added. |
| `regret` | number | yes | best - gain: set points left on the table by this pick (0 = greedy). |
| `denied` | boolean | yes | The card was the receiver's best and not the picker's: a hate pick. |
| `missed` | boolean | yes | No pick in time: the first card of the pack was taken. |
| `returnable` | boolean | no | With a burn: the pack still had enough cards to come back to the burner, so the burned card could have come back to it (P126). |

### `draft_game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `hands` | record of object[] | yes |  |
| `breakdown` | record of object | yes |  |
| `totals` | record of number | yes |  |

### `draft_game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `reference` | object | yes |  |
| `reference.seats` | record of object | yes |  |
| `reference.sharedLanes` | integer | yes |  |
| `reference.efficiency` | number | yes |  |

### `draft_match_ended`

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
| `games` | integer ≥ 1 ≤ 20 | `3` | Games in the match; the run ends after the last. |
| `packs` | integer ≥ 1 ≤ 4 | `2` | Pack rounds per game; the passing direction turns every round. |
| `packSize` | integer ≥ 2 ≤ 15 | `6` | Cards in a pack. |
| `wilds` | integer ≥ 0 | `4` | Lodestones (wild ore) in a game's deck; the rest is split over the four resources. |
| `majorityBonus` | integer ≥ 0 | `5` | Points for strictly the most cards of a resource (wilds do not count; a tie scores nothing). |
| `burnCost` | integer ≥ 0 | `0` | Points a burn costs (0 since P123: bots showed a burn pays only when it is free and late). |
| `placeBonus` | (integer ≥ 0)[] | `[10,5]` | Points per game for the first, second, ... place by the score before this bonus; a tie shares the better place. Empty: none. |
| `maxBurns` | integer ≥ 0 | `2` | Burns a seat may make per game. |
| `openHands` | boolean | `false` | Every seat sees every quarry during the game (off: only at the game's end). |
| `deadline` | integer ≥ 1 | `2` | Minutes a pick stays open before a missing pick takes the first card of the pack. |

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
| `draft-rounds.tablePoints` | Points of the table | points | `draft_match_ended` |
| `draft-rounds.sharedLanes` | Seats that share a lane, over the games | - | `draft_game_scored` |
| `draft-rounds.decisions` | Picks | - | `draft_card_picked` |
| `draft-rounds.missedPicks` | Picks not made in time | - | `draft_card_picked` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [draft-rounds/tools/viewTable](prompts/draft-rounds/tools/viewTable.md) | - |
| [draft-rounds/tools/pick](prompts/draft-rounds/tools/pick.md) | - |
| [draft-rounds/rules](prompts/draft-rounds/rules.md) | `seats`, `games`, `packs`, `packSize`, `deck`, `majorityBonus`, `burnRule`, `places` |
| [draft-rounds/game-head](prompts/draft-rounds/game-head.md) | `game`, `games` |
| [draft-rounds/task-pick](prompts/draft-rounds/task-pick.md) | `pack`, `packs`, `step`, `from`, `cards`, `quarry`, `burnLine`, `receiver` |

<!-- /generated:prompts -->

## Example

From [`games/quarry/game.ts`](../../games/quarry/game.ts):

```ts
draftRounds({ games, packs, packSize, openHands, deadline: DEADLINE, ...(burns ? {} : { maxBurns: 0 }) }),
```

The option `openHands` of the game shows every quarry during play; without its option `burns` the game sets
`maxBurns: 0`.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P121, P122** the per-pick greedy reference is blunt and the greedy table a noisy baseline. Open.
- **P123, P125** the burn was never used while it cost points; free burns guard the own lane and shrink the table.
  Answered (`burnCost` 0).
- **P124** a tied top lane was named by list order. Fixed.
- **P126** the brain does not learn a cost it cannot see. Partly fixed.
- **P127** pick calls without a card. By design.

## Tests

[`test/draft-rounds.test.ts`](test/draft-rounds.test.ts): three games with sealed picks, burns and the reference
score, the deadline, the pick open only for a seat that owes one, passing directions, documented options, determinism
and a run resumed from a snapshot. [`test/model.test.ts`](test/model.test.ts): the deck, scoring with lodestones,
majorities and burns, the greedy table. [`test/carried.test.ts`](test/carried.test.ts) holds the prompt files, tools,
options, events, audiences and the snapshot slice to those of the old platform. The game is tested in
[`games/quarry/test/`](../../games/quarry/test/).

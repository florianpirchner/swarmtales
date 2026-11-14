# Draft rounds

A drafting game (the game of Quarry) for solo seats. In each pack round every seat opens a pack, keeps one card and
passes the rest on, until the packs are empty; then each quarry scores the square of each resource it collected, a
bonus for the single biggest holder of a resource, and a place bonus. A seat may also burn a card to deny it to the
next seat.

Copied from `mechanics/draft-rounds/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Cards.** Four resources (amber, basalt, cobalt, jade) and a wild ore (lodestone, `wilds` per game).
2. **Pack rounds.** A game has `packs` pack rounds of `packSize` cards. Every seat opens a pack (`draft_pick_opened`),
   keeps one card with `pick` and passes the rest: to the next seat in odd rounds, to the previous one in even rounds.
   Picks are simultaneous and sealed (`draft_card_picked`, for the human only). With a pick a seat may also burn one
   more card of the pack (`maxBurns` per game, `burnCost` points each). A pick not made within `deadline` minutes takes
   the first card and is marked missed.
3. **What a seat sees.** `viewTable` shows its own pack, its quarry and who passed the pack to it. Other quarries are
   revealed at the game's end (`openHands` shows them all along).
4. **Scoring.** Each resource scores the square of its cards; a set takes at most one lodestone and the lodestones go
   to the biggest sets. The single seat with the most cards of a resource gets `majorityBonus` (a tie scores nothing,
   so a hate pick can cost a neighbour its bonus). `placeBonus` pays the first, second ... place of the game
   (`draft_game_ended`).
5. **Reference.** Every pick is scored against the greedy pick (what it added against the best card, and whether it
   took the receiver's best card), and each game against a greedy table on the same deal (`draft_game_scored`, for the
   human only). It provides `brain-source` for the strategy-brain.

## Tools

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads (draft-rounds/tools/viewTable):

> Look at the table: the rules, the pack in front of you, your quarry, your burns left and your points from earlier games.

### `pick`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | string | yes | The id of the card you keep (for example A3). |
| `burn` | string | no | Optional: the id of a second card of the pack to destroy before the pack moves on (limited per game). |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (draft-rounds/tools/pick):

> Keep one card of the pack in front of you (card, by its id) with a short reason; the rest moves on to the next seat. Optionally burn a second card of the pack (burn, by its id) to destroy it before the pack moves on: limited per game, and it may cost points (the rules say how many). Sealed: nobody sees your pick until the game ends. Once per pick, only while you hold a pack.

## Events

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

## Options

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



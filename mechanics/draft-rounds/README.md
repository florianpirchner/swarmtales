# draft-rounds

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-draft-rounds` |
| Id | `draft-rounds` |
| Summary | The drafting game Quarry for solo seats: packs passed around a table, one sealed pick each, quarries of four resources scored at the end of a game. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextGame` |
| Stories | [quarry](../../stories/quarry/README.md) (all 4 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads ([draft-rounds/tools/viewTable](prompts/draft-rounds/tools/viewTable.md)):

> Look at the table: the rules, the pack in front of you, your quarry, your burns left and your points from earlier games.

### `pick`

- Suggested for: `resident`

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
| [draft-rounds/tools/viewTable](prompts/draft-rounds/tools/viewTable.md) | - |
| [draft-rounds/tools/pick](prompts/draft-rounds/tools/pick.md) | - |
| [draft-rounds/rules](prompts/draft-rounds/rules.md) | `seats`, `games`, `packs`, `packSize`, `deck`, `majorityBonus`, `burnRule`, `places` |
| [draft-rounds/game-head](prompts/draft-rounds/game-head.md) | `game`, `games` |
| [draft-rounds/task-pick](prompts/draft-rounds/task-pick.md) | `pack`, `packs`, `step`, `from`, `cards`, `quarry`, `burnLine`, `receiver` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

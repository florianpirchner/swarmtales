# optimal-referee

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-optimal-referee` |
| Id | `optimal-referee` |
| Summary | Scores every grid-game move against minimax (value before and after, class); read-only, for the human and the reporter. |
| Requires | `grid-game` (from [grid-game](../grid-game/README.md)) |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | none |
| Jobs | none |
| Stories | [tictactoe-teams](../../stories/tictactoe-teams/README.md) (all 5 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic defines no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `move_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `moveNo` | integer | yes | The scored move's number in its game, as in move_played. |
| `side` | "X" or "O" | yes |  |
| `value_before` | integer ≥ -1 ≤ 1 | yes |  |
| `value_after` | integer ≥ -1 ≤ 1 | yes |  |
| `class` | "optimal" or "blunder" or "missed_win" or "missed_block" | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxEmptyCells` | integer ≥ 2 ≤ 16 | `9` | Positions with more free cells than this are not scored (minimax on a big board is slow). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic provides no API to other mechanics.

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts: none besides the tool descriptions.

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

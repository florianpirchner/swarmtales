# morris-referee

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-morris-referee` |
| Id | `morris-referee` |
| Summary | Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter. |
| Requires | none |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | none |
| Jobs | none |
| Stories | [morris-teams](../../stories/morris-teams/README.md) (all 2 variants) |

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
| `turnNo` | integer | yes | The scored turn's number in its game, as in move_played. |
| `side` | "X" or "O" | yes |  |
| `class` | "best" or "inaccuracy" or "blunder" or "missed_win" | yes |  |
| `best` | integer | yes | The search value of the best turn, for the side that moved (100 = one piece). |
| `played` | integer | yes | The search value of the played turn. |
| `depth` | integer | yes | Whole turns searched. |
| `alternatives` | integer | yes | Legal turns in the position. |
| `missedMill` | boolean | yes | A turn that closes a mill was legal and the played turn closed none. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `depth` | integer ≥ 1 ≤ 6 | `3` | Whole turns the search looks ahead at most. |
| `maxNodes` | integer ≥ 1000 | `200000` | Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts. |

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

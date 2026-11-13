# arena

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-arena` |
| Id | `arena` |
| Summary | The old arena's run events and turn policy: start and end, standings, stop reasons, budget, act brakes and the snapshot cut. |
| Requires | `progression` (from [progression](../progression/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `tribunal-view` (from [tribunal](../tribunal/README.md)), `ending` |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | `seatsDecided`, `snapshot`, `stopping` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

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

### `run_start`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `story` | string | yes |  |
| `agents` | string[] | yes |  |
| `minutes` | integer | yes |  |
| `seed` | integer | yes |  |
| `meta` | record of string | no |  |

### `round_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes |  |
| `standings` | object[] | yes |  |
| `standings[].agent` | string | yes |  |
| `standings[].level` | integer | yes |  |
| `standings[].points` | number | yes |  |
| `standings[].rank` | integer | yes |  |
| `standings[].tools` | integer | yes |  |
| `standings[].activated` | boolean | yes |  |

### `act_brake`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | string | yes |  |
| `fromLevel` | integer | yes |  |
| `toLevel` | integer | yes |  |
| `startedAt` | integer | yes |  |
| `maxMinutes` | integer | yes |  |
| `behind` | object[] | yes |  |
| `behind[].agent` | string | yes |  |
| `behind[].level` | integer | yes |  |
| `snapshot` | boolean | no |  |

### `run_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no |  |
| `standings` | object[] | yes |  |
| `standings[].agent` | string | yes |  |
| `standings[].level` | integer | yes |  |
| `standings[].points` | number | yes |  |
| `standings[].rank` | integer | yes |  |
| `standings[].tools` | integer | yes |  |
| `standings[].activated` | boolean | yes |  |
| `ending` | object | no |  |
| `ending.id` | string | yes |  |
| `ending.title` | string | yes |  |
| `ending.summary` | string | no |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `story` | string | required | The story's id, as `run_start` names it (the old `world.story.id`). |
| `meta` | record of string | unset | The run's labels, logged in `run_start` (the old `ArenaOptions.meta`). |
| `stopWhenDone` | boolean | `false` | End the run as soon as every resident in the city has passed the last level. |
| `stopWhenSeatsDecided` | boolean | `false` | End the run once open rewards can no longer change who survives. |
| `rewards` | object[] | `[]` | The reward of every level of the story (`levels[].reward`): what is still open to a resident, for `stopWhenSeatsDecided`. |
| `rewards[].level` | integer ≥ 1 | required |  |
| `rewards[].reward` | number | required |  |
| `acts` | object[] | `[]` | The story's acts in its order (`story.acts`), for their brakes. |
| `acts[].title` | string | required |  |
| `acts[].fromLevel` | integer ≥ 1 | required |  |
| `acts[].maxMinutes` | integer ≥ 1 | unset | The act's brake: minutes after its start before the run logs `act_brake` (v08). |
| `tribunalAct` | integer ≥ 1 | unset | The first level of the tribunal's act (`tribunal.act`, else the start level): the tribunal ends that act, it has no brake. |
| `budgetUsd` | number ≥ 0 | unset | End the run once this run's model spend (its `usage` app events) exceeds it (`run.budgetUsd`). |
| `snapshot` | object | unset | The run snapshot the app takes once every resident has passed `afterLevel` (SPEC 17); the fact `arena.snapshot` says when. |
| `snapshot.afterLevel` | integer ≥ 1 | required |  |
| `snapshot.atMinute` | integer ≥ 0 | unset | Due at the first minute's end at or after this minute instead. |
| `snapshot.stop` | boolean | required | End the run right after the snapshot. |
| `snapshot.file` | string | required | Where the app writes the snapshot, for the run's end reason. |

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

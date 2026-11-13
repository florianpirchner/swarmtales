# goals

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-goals` |
| Id | `goals` |
| Summary | Secret goals per resident. |
| Requires | `progression` (from [progression](../progression/README.md)), `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `motives` (from [motives](../motives/README.md)) |
| Provides | `goals` |
| State | kept, snapshot slice version 1 |
| Facts | `running`, `texts` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md) |

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

### `goal_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes |  |
| `agent` | string | yes |  |
| `goal` | object | yes |  |
| `text` | string | yes |  |

### `goal_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes |  |
| `agent` | string | yes |  |
| `goal` | object | yes |  |
| `fulfilled` | boolean | yes |  |
| `void` | boolean | no |  |
| `bonus` | integer | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `acts` | (integer ≥ 1)[] | `[]` | The first level of each act that deals goals. |
| `bonus` | integer ≥ 0 | `0` | Points a fulfilled goal pays at the act's end. |
| `leadTribunals` | integer ≥ 1 | `1` | How many tribunals a `lead` goal asks the holder to lead a faction in. |
| `againstCoreMotive` | number ≥ 0 ≤ 1 | `0` | The share of residents whose goal does not follow their core motive. |
| `matches` | object | `{}` | The drive ids that suggest each kind of goal. |
| `matches.protect` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.exile` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.outrank` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.lead` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.heir` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `factions` | boolean | `false` | Whether the city holds faction drafts: `lead` goals need them. |
| `texts` | object | required | The story's words. |
| `texts.protect` | string | required | The goal `protect`; {target}. |
| `texts.exile` | string | required | The goal `exile`; {target}. |
| `texts.outrank` | string | required | The goal `outrank`; {target}. |
| `texts.lead` | string | required | The goal `lead`; {count}. |
| `texts.heir` | string | required | The goal `heir`. |
| `texts.notice` | string | required | Private notice when a goal is dealt; {goal}, {bonus}. |
| `texts.status` | string | required | Status line part while the act runs; {goal}, {bonus}. |
| `texts.fulfilled` | string | required | Private notice when a goal is fulfilled; {goal}, {bonus}. |
| `texts.missed` | string | required | Private notice when it is not; {goal}. |
| `texts.exiledReadout` | string | required | Board post when an exiled resident leaves; {resident}, {goal}. |
| `texts.readout` | string | required | Board post at the act's end; {list}. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `goals`

Secret goals per resident.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `onExiled` | command | resident: string | null | A resident left the city: its goal is void and read out (old `goals.onExiled`); writes `goal_resolved`. |
| `noteLeaders` | command | leaders: string[] | null | Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`; tribunal calls it on `faction_leaders`). |
| `noteHeir` | command | heir: string | null | A last will left the resident something (old `noteHeir`; exile calls it once per heir). |
| `goalOf` | query | resident: string | object or null | The goal the resident holds in an act still running, in the story's words, or null (old `goalOf`: status part, the gamemaker's privacy check). |

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

# script

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-script` |
| Id | `script` |
| Summary | The director's rules: courier lines, factor releases, the feast, standings and petitions. |
| Requires | none |
| Uses when loaded | `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)), `cast` (from [cast](../cast/README.md)), `petitions` (from [petitions](../petitions/README.md)), `ledger` (from [ledger](../ledger/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)), `exile` (from [exile](../exile/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | none |
| Jobs | `minuteRan` |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `directorMinute`

- Suggested for: `script`
- Serves only: `script`

No parameters.

What the caller reads ([tools/directorMinute](prompts/tools/directorMinute.md)):

> Runs the director's rules of the minute that start with time: after the petitions whose deadline came, before anything else of the minute. Called by the host for the script, never by a resident.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `director_action`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes |  |
| `action` | string | yes |  |
| `actor` | string | no |  |
| `via` | string | no |  |
| `audit` | "NPC_LEVEL_SET" or "DIRECTOR_PRIVACY_BREACH" | no |  |

### `director_skipped`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes |  |
| `action` | string | yes |  |
| `reason` | string | yes |  |

### `standings_published`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | "bands" or "snapshot" | yes |  |
| `postSeq` | integer | yes |  |
| `safe` | string[] | no |  |
| `edge` | string[] | no |  |
| `out` | string[] | no |  |
| `exiled` | string[] | no |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object[] | `[]` | The story's director rules (`story.director`), in the story's order. |
| `rules[].id` | string | required |  |
| `rules[].trigger` | object | required |  |
| `rules[].when` | object[] | required |  |
| `rules[].actions` | any[] | required |  |
| `cast` | string[] | `[]` | The ids of the story's cast members (`Object.keys(story.cast)`): a post by an inactive one is skipped. |

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

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/directorMinute](prompts/tools/directorMinute.md) | - |
| [script/standings-bands](prompts/script/standings-bands.md) | `minute`, `safe`, `edge`, `out` |
| [script/standings-bands-exiled](prompts/script/standings-bands-exiled.md) | `minute`, `safe`, `edge`, `out`, `exiled` |
| [script/standings-snapshot](prompts/script/standings-snapshot.md) | `minute`, `rows` |
| [script/standings-row](prompts/script/standings-row.md) | `rank`, `agent`, `points`, `level` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

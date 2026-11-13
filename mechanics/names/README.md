# names

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-names` |
| Id | `names` |
| Summary | Names residents chose, for texts and arguments. |
| Requires | none |
| Uses when loaded | `puzzles` (from [puzzles](../puzzles/README.md)), `channels` (from [channels](../channels/README.md)), `exile` (from [exile](../exile/README.md)) |
| Provides | `names` |
| State | kept, snapshot slice version 1 |
| Facts | `names` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `chooseName`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Your name, e.g. Mira |

What the caller reads ([tools/chooseName](../../library/prompts/tools/chooseName.md)):

> Chooses the name the city knows you by, once and for good: 3 to 16 characters (letters, digits, hyphens, starting with a letter), not taken by another resident, not the city's or its cast's, not like a resident ID. The board announces it, and from then on every resident sees your name instead of your ID. Whoever has no name when the choice closes gets one from the city.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `name_chosen`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `name` | string | yes |  |
| `fallback` | boolean | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `untilMinute` | integer ≥ 0 | `2` | The minute at whose start the city names whoever has not chosen. |
| `announcement` | string | required | Added to the first task while a resident may choose; placeholder {untilMinute}. Required: the story's text (R2-D17); an empty text says nothing on purpose. |
| `fallbackWords` | string[] | `["Stone","Ash","Reed","Flint","Moss","Wren"]` | Words of the names the city gives, letters only, so a name stays within 16 characters. |
| `reserved` | string[] | `[]` | Names nobody may take besides the system authors: the cast, the city. |
| `off` | boolean | `false` | The off switch: a run that keeps IDs (a story without names, `--no-names`, a run that starts past the first level). The book provides NamesApi with no names, `chooseName` stays locked, nothing is announced. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `names`

Names residents chose, for texts and arguments.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `hasNames` | query | - | boolean | Whether the story names residents at all (old `hasNames`). |
| `nameOf` | query | resident: string | string or null | The chosen name, or null (old `nameOf`). |
| `labelOf` | query | resident: string | string | `Name (ID)` once the resident chose a name, the bare id before (old `labelOf`). |
| `resolve` | query | text: string | string | The id a name or id stands for; other text comes back unchanged (old `resolveResident`). |
| `taskLine` | query | resident: string | string or null | The choose-name line under a task (and the closed-door text) while the resident may still choose, else null (old `#withNameChoice`); progression appends it. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/chooseName](../../library/prompts/tools/chooseName.md) | - |
| [replies/name-chosen](../../library/prompts/replies/name-chosen.md) | `name` |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [competitor/status/you-are](../../library/prompts/competitor/status/you-are.md) | `agent` |
| [notices/name-announced](prompts/notices/name-announced.md) | `agent`, `name` |
| [notices/name-fallback](prompts/notices/name-fallback.md) | `name` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

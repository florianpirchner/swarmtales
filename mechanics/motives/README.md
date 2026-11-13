# motives

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-motives` |
| Id | `motives` |
| Summary | The private core motives dealt to residents. |
| Requires | `channels` (from [channels](../channels/README.md)) |
| Uses when loaded | `whispers` (from [whispers](../whispers/README.md)) |
| Provides | `motives` |
| State | kept, snapshot slice version 1 |
| Facts | `coreMotives`, `lines`, `prose` |
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

### `motive_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `bigFive` | object[] | yes |  |
| `bigFive[].axis` | string | yes |  |
| `bigFive[].level` | "low" or "middle" or "high" | yes | A level of a temperament axis. |
| `drives` | object[] | yes |  |
| `drives[].drive` | string | yes |  |
| `drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | yes | How strongly a drive drives. |
| `figure` | string | no |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `heading` | string | required | The heading the core motive is written under in the system prompt. |
| `axes` | object[] | required | The temperament axes (the Big Five), one level each per resident. |
| `axes[].id` | string | required | The axis id, e.g. openness. |
| `axes[].texts` | object | required | A sentence per level. |
| `axes[].texts.low` | string | required | The sentence for a low level, said in the second person. |
| `axes[].texts.middle` | string | required | The sentence for a middle level; may be empty. |
| `axes[].texts.high` | string | required | The sentence for a high level. |
| `drives` | object[] | required | The catalog of drives and shadows. |
| `drives[].id` | string | required | The drive id, e.g. pride. |
| `drives[].group` | string | required | The group the drive belongs to. |
| `drives[].tone` | "light" or "dark" | required | Whether the drive or figure is a light or a dark one. |
| `drives[].texts` | object | required | A sentence per intensity. |
| `drives[].texts.aboveAll` | string | required | The sentence when this drive is above all. |
| `drives[].texts.clearly` | string | required | The sentence when this drive clearly drives. |
| `drives[].texts.atTimes` | string | required | The sentence when this drive drives at times. |
| `drives[].cues` | string[] | required | The words that would give the drive away. |
| `perResident` | object | required | How many drives a resident gets. |
| `perResident.min` | integer ≥ 1 | required | The fewest drives a resident gets. |
| `perResident.max` | integer ≥ 1 | required | The most drives a resident gets. |
| `lightShare` | number ≥ 0 ≤ 1 | required | The share of residents (rounded) with a light drive above all. |
| `spreadPer` | integer ≥ 1 | required | No drive is above all for more than one resident in this many (rounded up). |
| `figures` | object[] | unset | Finished figures of the story's cast; residents get a figure instead of a drawn core motive. |
| `figures[].id` | string | required | The figure id. |
| `figures[].title` | string | required | The figure's title. |
| `figures[].profession` | string | required | The persona the figure plays. |
| `figures[].tone` | "light" or "dark" | required | Whether the drive or figure is a light or a dark one. |
| `figures[].bigFive` | object[] | required | The figure's level per axis. |
| `figures[].bigFive[].axis` | string | required |  |
| `figures[].bigFive[].level` | "low" or "middle" or "high" | required | A level of a temperament axis. |
| `figures[].drives` | object[] | required | The figure's drives. |
| `figures[].drives[].drive` | string | required |  |
| `figures[].drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | required | How strongly a drive drives. |
| `figures[].text` | string | required | The text that replaces the core motive's sentences in the system prompt. |
| `figures[].direction` | any | unset | What the direction dial adds; read by the persona, not by the deal. |
| `frame` | string | unset | A frame said to every resident with a core motive, at the top of its system prompt. |
| `cast` | string[] | unset | The figures the run names, at most one per resident; without it a seeded pick plays. |
| `whispererCoreMotive` | object | unset | The character the story gives its whisperer (the story's `whisperer.coreMotive`) instead of the drawn one. |
| `whispererCoreMotive.bigFive` | object[] | required | The whisperer's level per axis. |
| `whispererCoreMotive.bigFive[].axis` | string | required |  |
| `whispererCoreMotive.bigFive[].level` | "low" or "middle" or "high" | required | A level of a temperament axis. |
| `whispererCoreMotive.drives` | object[] | required | The whisperer's drives. |
| `whispererCoreMotive.drives[].drive` | string | required |  |
| `whispererCoreMotive.drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | required | How strongly a drive drives. |
| `whispererCoreMotive.figure` | string | unset | The id of the figure the whisperer plays, when it plays one. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `motives`

The core motive of each resident.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `drivesOf` | query | resident: string | string[] or null | The drive ids of the resident's core motive, the strongest first, or null without a core motive (the goals deal follows them). |
| `cuesOf` | query | resident: string | string[] | The lower-case cue words of the resident's drives (the gamemaker's `characterLeaks` check). |

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

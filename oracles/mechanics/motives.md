# Motives

Core motives: who a resident is. Once, at the start, every resident is dealt a seeded character: one drive above all,
up to two more, and a temperament on the Big Five axes, or one of the story's finished figures. It goes into the
resident's system prompt as who it is, never as what to do, and it never changes.

Copied from `mechanics/motives/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The deal.** At the start of a run (or before the next minute when a snapshot has none) every resident gets a core
   motive in roster order (`motive_dealt`): a level per axis of `axes`, between `perResident.min` and `max` drives from
   `drives` with intensities (`aboveAll`, `clearly`, `atTimes`), exactly one above all. `lightShare` sets how many
   residents have a light drive above all; `spreadPer` keeps one drive from being above all for too many residents.
2. **Figures.** With `figures` and `cast` the run names finished figures (persona, temperament, drives, a written
   text), at most one per resident; the rest are drawn. The whisperer of Whispers can get its own character
   (`whispererCoreMotive`).
3. **Who reads it.** Nobody in the game: there is no tool and no status line. The facts `coreMotives`, `prose` and
   `lines` are for the app (the system prompt, under `heading` and after `frame`), the gamemaker, `goals` (which match
   goals to drives) and the reports.

## Tools

This mechanic defines no tools.

## Events

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

## Options

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



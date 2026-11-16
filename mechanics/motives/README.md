# Motives

Core motives: who a resident is. Once, at the start, every resident is dealt a seeded character: one drive above all,
up to two more, and a temperament on the Big Five axes, or one of the game's finished figures. It goes into the
resident's system prompt as who it is, never as what to do, and it never changes. Ported from the old platform
(M5-23).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-motives` |
| Id | `motives` |
| Summary | The private core motives dealt to residents. |
| Requires | none |
| Uses when loaded | `whispers` (from [whispers](../whispers/README.md)), `identity` (from [names](../names/README.md)) |
| Provides | `motives` |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The deal.** When the run starts every resident gets a core motive in roster order (`motive_dealt`): a level per
   axis of `axes`, between `perResident.min` and `max` drives from `drives` with intensities (`aboveAll`, `clearly`,
   `atTimes`), exactly one above all. `lightShare` sets how many residents have a light drive above all; `spreadPer`
   keeps one drive from being above all for too many residents. The random labels are the old ones (`cores`,
   `figures`, `cast`, each with the number of residents).
2. **Figures.** With `figures` the residents play finished figures (persona, temperament, drives, a written text): the
   ones `cast` names, at most one per resident, or a seeded pick; the rest are drawn. A wrong cast is refused when the
   run is set up (`SWT-G020`, with the old words).
3. **The whisperer.** When `whispers` is loaded, `motives` asks it who the whisperer is (the service `whispers` of
   `@swarmtales/mechanic-whispers/contract`, one direction), and the whisperer plays `whispererCoreMotive`. Load
   `whispers` before `motives`, so that `whisperer_chosen` comes first, as in the files.
4. **Who reads it.** Nobody in the game: there is no tool and no status line. The facts `coreMotives`, `prose` and
   `lines` are for the system prompt (under `heading` and after `frame`), the gamemaker (in the shapes of
   `mechanics/city-directors/src/gamemaker/report/characters.ts`) and the reports; `goals` reads the drives through
   the service `motives` (`@swarmtales/mechanic-motives/contract`).
5. **On the tools of others.** A Director's note (the tools of `noteTools`, by bare name, default `notify` and
   `boardNote` of `channels`) that names another resident in a sentence with a word about a core motive or a goal
   (`deep down`, `above all`, `drive`, `goal`, ...) or a cue word of that resident's drives is refused with
   `PRIVATE_BLOCKED` in a `rule` handler; the text is `text`, or `reason` for a tribunal's tool. A note to the
   resident itself may say it. The check is the pure `characterLeaks` of `@swarmtales/mechanic-motives/rules`, which
   `goals` uses for the goals' cues.

**Not done here:** the old deal at a resume whose snapshot has no core motives (v09), and the old snapshot's slice
(version 0): an old snapshot is not resumed here (decision A56).

## Which refusal comes first

The old note desk checked secret, thoughts, motive, role, repeat in one function. Now the length and the repeat are
the tool's own rule, then each owner's `rule` handler in load order: in the games' order (`whispers` before
`motives` before `puzzles`) a note that points at the whisperer and gives a core motive away reads the role's
refusal, and a note that holds a password piece and a core motive reads the motive's.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `motive_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident. |
| `bigFive` | object[] | yes | Its level per axis. |
| `bigFive[].axis` | string | yes | The axis id, e.g. openness. |
| `bigFive[].level` | "low" or "middle" or "high" | yes | A level of a temperament axis. |
| `drives` | object[] | yes | Its drives, above all first. |
| `drives[].drive` | string | yes | The drive id, e.g. pride. |
| `drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | yes | How strongly a drive drives. |
| `figure` | string | no | The figure it plays, when it plays one. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `figures[].bigFive[].axis` | string | required | The axis id. |
| `figures[].bigFive[].level` | "low" or "middle" or "high" | required | A level of a temperament axis. |
| `figures[].drives` | object[] | required | The figure's drives. |
| `figures[].drives[].drive` | string | required | The drive id. |
| `figures[].drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | required | How strongly a drive drives. |
| `figures[].text` | string | required | The text that replaces the core motive's sentences in the system prompt. |
| `figures[].direction` | any | unset | What the direction dial adds; read by the persona, not by the deal. |
| `frame` | string | unset | A frame said to every resident with a core motive, at the top of its system prompt. |
| `cast` | string[] | unset | The figures the run names, at most one per resident; without it a seeded pick plays. |
| `whispererCoreMotive` | object | unset | The character the story gives its whisperer (the story's `whisperer.coreMotive`) instead of the drawn one. |
| `whispererCoreMotive.bigFive` | object[] | required | The whisperer's level per axis. |
| `whispererCoreMotive.bigFive[].axis` | string | required | The axis id, e.g. openness. |
| `whispererCoreMotive.bigFive[].level` | "low" or "middle" or "high" | required | A level of a temperament axis. |
| `whispererCoreMotive.drives` | object[] | required | The whisperer's drives. |
| `whispererCoreMotive.drives[].drive` | string | required | The drive id, e.g. pride. |
| `whispererCoreMotive.drives[].intensity` | "aboveAll" or "clearly" or "atTimes" | required | How strongly a drive drives. |
| `whispererCoreMotive.figure` | string | unset | The id of the figure the whisperer plays, when it plays one. |
| `whisperer` | object | unset | The game's whisperer plays (the whispers' `whisperer`, in a run that is no control run): the resident it names, else the seeded pick of `pickWhisperer` of the whispers' `/rules`. Without it nobody plays `whispererCoreMotive`. |
| `whisperer.agent` | string | unset | The resident the game names as its whisperer (the whispers' `whisperer.agent`). |
| `personas` | object[] | unset | The catalogue of personas (the old story's `personas`), dealt by seat from the run seed as the old `assignPersonas` did; without it nobody has a persona. |
| `personas[].name` | string | required | The persona's name, e.g. Archivist. |
| `personas[].temperament` | string | required | How it feels and reacts. |
| `personas[].values` | string | required | What it holds dear. |
| `personas[].voice` | string | required | How it speaks. |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` (or `reason`) is checked for a resident's core motive (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `motives`

The core motive of each resident.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `drivesOf` | query | resident: string | string[] or null | The drive ids of the resident's core motive, the strongest first, or null without a core motive (the goals deal follows them). |
| `cuesOf` | query | resident: string | string[] | The lower-case cue words of the resident's drives (the gamemaker's `characterLeaks` check). |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [motives/notes/private-core-motive](prompts/motives/notes/private-core-motive.md) | `who` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), channels(), whispers({ whisperer }), motives({ ...catalogue, whispererCoreMotive, noteTools: ["notify", "boardNote", "callTribunal", "announceTribunal", "permaDeath"] })],
```

## Lessons and loopholes

None recorded that concern the deal itself; how residents play their motives is in the City of Keys and Whispers rows
of [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md) (P45, P69).

## Tests

[`test/motives.test.ts`](test/motives.test.ts): the deals of `whispers-s7`, `whispers-s11`, `cityofkeys-act1-s7` and
`cityofkeys-act1-s11` byte for byte (the whisperer's own character, the seeded cast of figures), one drive above all,
seeded and kept, named figures and refused casts, the facts and the service, the core-motive check of a Director's
note, the documented options and the resume at every boundary.

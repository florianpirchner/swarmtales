# Names

Residents choose their own names. At the start of a fresh run every resident may pick the name the city knows it by
with `chooseName`, once and for good; whoever has none when the choice closes gets one from the city. From then on
every text a resident reads shows names instead of IDs, and a name works wherever a tool asks for a resident.

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

1. **The choice.** Until minute `untilMinute` starts, `chooseName` is open. A name has 3 to 16 characters (letters,
   digits, hyphens, starting with a letter), is not taken, not one of the `reserved` names (the cast, the city) and
   does not look like a resident ID. The board announces it (`name_chosen`) and the resident is told privately. While a
   resident may still choose, its first task carries the story's `announcement` (with `{untilMinute}` filled in).
2. **The fallback.** At the start of `untilMinute` the city names every resident that has none from `fallbackWords`.
3. **Presentation.** IDs stay the keys of every event and snapshot. The mechanic gives the host a `display` that
   replaces IDs with names in every text a caller reads (a password piece that only looks like an ID stays as it is),
   and a `resolve` that turns a name back into an ID in tool arguments, in any case. Other mechanics ask for
   `labelOf` (`Name (ID)`) and `nameOf` through the `names` API. The status line tells each resident who it is.
4. **Off.** With `off` (a story without names, `--no-names`, or a run that starts past the first level) the
   mechanic provides the API with no names, keeps `chooseName` locked and writes nothing.

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

The city runner turns the story's `names` block into options
([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
names.with({ untilMinute: spec.untilMinute, announcement: spec.announcement, fallbackWords: [...spec.fallbackWords],
	reserved: [...Object.keys(story.cast), story.city] });
```

Cast members and the city's own name are reserved, so no resident can pose as them.

## Lessons and loopholes

None recorded yet in [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). P65 (a vote ranking that named IDs)
was a `whispers` text, fixed there.

## Tests

- [`test/mechanics/names/names.test.ts`](../../test/mechanics/names/names.test.ts): the golden gate for `name_chosen`;
  choosing (refusals, the board and private notices, closing at its minute); names in texts and arguments; the task
  line while a resident may choose; determinism, snapshots and the legacy slices.
- [`names-presentation.test.ts`](../../test/mechanics/names/names-presentation.test.ts): the status line, `display`
  and the required announcement.
- [`names-off.test.ts`](../../test/mechanics/names/names-off.test.ts): the switched-off book against the switched-on one.
- [`names-differential.test.ts`](../../test/mechanics/names/names-differential.test.ts): `chooseName` against the old
  engine.

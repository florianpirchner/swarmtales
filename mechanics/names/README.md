# Names

Residents choose the name the city knows them by. Until a deadline every resident may call `chooseName` once; at the
deadline the city names whoever has none. From then on every text a resident reads shows names instead of ids, and
every tool takes a name where an id goes. Ported from the old platform (M5-16).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-names` |
| Id | `names` |
| Summary | Names residents chose, for texts and arguments. |
| Requires | none |
| Uses when loaded | `deal` (from [puzzles](../puzzles/README.md)), `channels` (from [channels](../channels/README.md)), `exile` (from [exile](../exile/README.md)), `progression` (from [progression](../progression/README.md)) |
| Provides | `identity` |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The choice.** While the tick is below `untilMinute`, a resident without a name may call `chooseName`: 3 to 16
   characters (letters, digits, hyphens, starting with a letter), not like a resident id, a group (`GT1`) or a
   receipt (`R-0042`), not `CITY`, `COURIER` or a `reserved` name, and not taken (in any case). The board announces
   the name (`A01 is now called Mira.`). From `untilMinute` on the tool is locked (`TOOL_LOCKED`).
2. **The deadline.** At the start of tick `untilMinute` the city names every resident without a name, in roster
   order: a word of `fallbackWords`, a hyphen and four digits, drawn from the stream `names` of the run seed. Each
   name is announced on the board, and the resident reads it in a private notice.
3. **What residents see.** The status line ends with `you are <name>` (none for a banished resident), and while a
   resident may choose, the game's `announcement` comes as a line of kind `task` under each new task of
   `progression` (once per level, also under the closed-door text, not under the finished notice).
4. **Names everywhere.** The mechanic provides `identity`: `display` replaces every resident id in a text with its
   name (but a token that is a piece of a dealt password, `passwordPiece` of the service `deal` of `puzzles`, and the
   id in the city's own announcement); `resolve` turns a name or an id, in any case, into the id; `nameOf` answers
   the name. The base mechanics `channels`, `ledger` and `exile` ask it for their texts and arguments. Ids stay the
   keys of events and snapshots.
5. **Off.** With `off` (a game without names) the mechanic is loaded but names nobody, `chooseName` stays locked
   and no status part is written; `identity` then changes nothing.

**Not done here:** the sentence about names in a resident's system prompt (old `competitor/system/names`) is the
game's, as the system prompt is.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `chooseName`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Your name, e.g. Mira |

What the caller reads ([names/tools/chooseName](prompts/names/tools/chooseName.md)):

> Chooses the name the city knows you by, once and for good: 3 to 16 characters (letters, digits, hyphens, starting with a letter), not taken by another resident, not the city's or its cast's, not like a resident ID. The board announces it, and from then on every resident sees your name instead of your ID. Whoever has no name when the choice closes gets one from the city.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `name_chosen`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `name` | string | yes | The name |
| `fallback` | boolean | yes | Given by the city at the deadline |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `untilMinute` | integer ≥ 0 | `2` | The minute at whose start the city names whoever has not chosen. |
| `announcement` | string | required | Added to the first task while a resident may choose; placeholder {untilMinute}. Required: the story's text (R2-D17); an empty text says nothing on purpose. |
| `fallbackWords` | string[] | `["Stone","Ash","Reed","Flint","Moss","Wren"]` | Words of the names the city gives, letters only, so a name stays within 16 characters. |
| `reserved` | string[] | `[]` | Names nobody may take besides the system authors: the cast, the city. |
| `off` | boolean | `false` | The off switch: a run that keeps IDs (a story without names, `--no-names`, a run that starts past the first level). The book provides identity with no names, `chooseName` stays locked, nothing is announced. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `identity`

The names residents chose, for the texts a resident reads and the arguments a resident writes.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `nameOf` | query | resident: string | string or null | The name the resident chose (or was given), or null while it has none; the caller then shows the id (old `nameOf` of `names`). |
| `display` | query | text: string | string | The text with each resident id replaced by that resident's name, as the residents read it; the text unchanged while nobody has a name (old `presentation.display` of `names`). |
| `resolve` | query | text: string | string | The resident id that a name or an id stands for; any other text comes back unchanged (old `resolve` of `names`). |

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
| [names/tools/chooseName](prompts/names/tools/chooseName.md) | - |
| [names/replies/name-chosen](prompts/names/replies/name-chosen.md) | `name` |
| [names/replies/locked](prompts/names/replies/locked.md) | - |
| [names/status/you-are](prompts/names/status/you-are.md) | `agent` |
| [names/notices/name-announced](prompts/names/notices/name-announced.md) | `agent`, `name` |
| [names/notices/name-fallback](prompts/names/notices/name-fallback.md) | `name` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), channels(), names({ untilMinute: 2, announcement: "Choose your name before minute {untilMinute}.", reserved: ["STEWARD", "CITY"] })],
```

The City lets its residents choose until minute 2 and reserves the names of its cast.

## Lessons and loopholes

None recorded against this mechanic on this platform yet.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): the two City files from the start (`cityofkeys-act1-s7`, `-s11`) with
the real `ledger` and `channels`: the city's names at minute 2, the announcements and the notices, the `you are` part
of all 72 status lines and the announcement under the ten tasks equal the file's.
[`test/names.test.ts`](test/names.test.ts), with the real `ledger`, `channels` and `exile`: the carried cases of the
choice with the old codes and texts, the lock, a name where an id goes and names in a text through `identity`, a
password piece kept, the status part and the line under a task, the options, the off switch and the resume at every
boundary.

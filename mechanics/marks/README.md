# Marks

A message allowance: talking costs marks. A resident gets a budget of marks per level (or one budget for the whole
run), each channel has a price (board post, group post, DM, shown receipt), and a message the resident cannot afford
is refused with `NO_MARKS`. Marks are not points: they cannot be transferred, they expire on a level change, and they
may come back over time.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-marks` |
| Id | `marks` |
| Summary | The marks a message costs and their refill. |
| Requires | none |
| Uses when loaded | `progression` (from [progression](../progression/README.md)) |
| Provides | `marks` |
| State | kept, snapshot slice version 1 |
| Facts | `remaining` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **Where marks apply.** Marks start at `rules.fromLevel`; below it every channel is free. Later level ranges
   (`rules.ranges`) can set their own allowance, prices and refill (the City of Keys makes the Act II wall cheaper to
   talk on than Act I). `levels` overrides the allowance of single levels.
2. **The allowance.** With `perLevel` every resident gets that many marks whenever it changes level; unused marks
   expire. With `perRun` (Whispers) there is one balance for the whole run that never resets and never refills. The
   level always comes from `progression` (`levelOf`); without a progression every resident is on `startLevel`.
3. **Spending.** The mechanic has no tools of its own. The mechanics that send messages ask it first and book
   after: `channels` calls `canAfford` before a board post, group post or DM and `spend` after it was sent;
   `receipts` and `whispers` do the same for a shown (or forged) receipt. A free channel (price 0) books nothing. A
   booking writes `marks_spent` with the balance left.
4. **Refill.** A range with `refill` gives back `marks` every `everyMinutes`, up to the allowance. The refill is booked
   lazily whenever the balance is read, in whole intervals, so it needs no job and does not depend on when it is read.
5. **What residents see.** The status line of every turn shows the marks left (`competitor/status/marks`), and the
   level's task ends with the marks terms (`task/marks-level`, `-refill` or `-run`, through `progression`).

**Not done here:** marks never buy anything but messages and receipt shows; points are the `ledger`'s.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic defines no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `marks_spent`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `channel` | "board" or "group" or "dm" or "receipt" | yes |  |
| `remaining` | number | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object | unset | The story's message allowance. |
| `rules.fromLevel` | integer ≥ 0 | required | The first level marks apply on. |
| `rules.perLevel` | integer ≥ 0 | unset | The allowance per level, reset whenever a resident changes level. |
| `rules.perRun` | integer ≥ 0 | unset | One allowance for the whole run instead, never reset and never refilled (Whispers). |
| `rules.prices` | object | required | Marks per channel. |
| `rules.prices.board` | integer ≥ 0 | required | Marks a board post costs. |
| `rules.prices.group` | integer ≥ 0 | required | Marks a group post costs. |
| `rules.prices.dm` | integer ≥ 0 | required | Marks a DM costs. |
| `rules.prices.receipt` | integer ≥ 0 | unset | Marks a shown receipt costs; 1 when left out. |
| `rules.ranges` | object[] | unset | Later level ranges, ascending. |
| `rules.ranges[].fromLevel` | integer ≥ 0 | required | The first level of the range. |
| `rules.ranges[].perLevel` | integer ≥ 0 | unset | The range's allowance; the base rules' when left out. |
| `rules.ranges[].prices` | object | unset | Marks per channel. |
| `rules.ranges[].refill` | object | unset | Marks regained on a level, up to its allowance. |
| `levels` | object[] | `[]` | Allowances of single levels (the story's `levels[].marks.perLevel`). |
| `levels[].level` | integer ≥ 1 | required | The level. |
| `levels[].perLevel` | integer ≥ 0 | required | Its allowance, in place of the rules'. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident is on where no progression mechanic answers `levelOf`. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `marks`

The marks a message costs and what is left of them.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `canAfford` | query | resident: string, channel: "board" or "group" or "dm" or "receipt" | boolean | Whether the resident may send on the channel now (old `#canAfford`); true without marks. |
| `left` | query | resident: string | object or null | The resident's marks, or null when the story has none. |
| `spend` | command | resident: string, channel: "board" or "group" or "dm" or "receipt" | object or null | Spends the channel's price once a message was sent (old `#spend`); writes `marks_spent`; null when marks do not apply. |
| `priceOf` | query | resident: string, channel: "board" or "group" or "dm" or "receipt" | number or null | What a message on the channel costs the resident at its level now, or null when marks do not apply (the holder notice's price). |
| `taskLine` | query | level: integer ≥ 1 | string or null | The marks terms under the task of `level` (old `#withMarks`), or null when marks are off there; progression appends it. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [competitor/status/marks](../../library/prompts/competitor/status/marks.md) | `remaining`, `budget` |
| [task/marks-level](prompts/task/marks-level.md) | `budget`, `board`, `group`, `dm`, `receipt` |
| [task/marks-level-refill](prompts/task/marks-level-refill.md) | `budget`, `board`, `group`, `dm`, `receipt`, `regain` |
| [task/marks-run](prompts/task/marks-run.md) | `budget`, `board`, `group`, `dm`, `receipt` |

<!-- /generated:prompts -->

## Example

From [`stories/cityofkeys/story.ts`](../../stories/cityofkeys/story.ts) (the city runner turns `rules.marks` into
`marks.with({ rules, levels })`):

```ts
const WALL_MARKS = { fromLevel: 8, prices: { board: 1, group: 0, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 3 } };
const MARKS = { fromLevel: 5, perLevel: 8, prices: { board: 0, group: 1, dm: 2, receipt: 1 }, ranges: [WALL_MARKS] };
```

From level 5 on every resident gets 8 marks per level: board posts are free, a group post costs 1, a DM 2. On the
wall (level 8 on) every channel but the group costs 1 mark, and one mark comes back every three minutes. Whispers
instead sets `perRun: 5` with only receipts priced.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH1** a 1-point transfer with a memo carried a message for free. Fixed (memos refuse digit runs).
- **LH2** a free board bypassed the price of DMs. Fixed in v03 (every Act II channel costs).
- **P16** marks ran out on a level nobody leaves. Fixed (refill).
- **P27** marks never bound: residents spent 0.34 marks a minute against a refill of 1. Built (refill every three
  minutes on the wall); untested live beyond v07, where the lowest balance was 1.

## Tests

- [`test/mechanics/marks/marks.test.ts`](../../test/mechanics/marks/marks.test.ts): the golden gate for
  `marks_spent`; the rules of the allowance (ranges, refill up to the allowance, free below the first level, a fresh
  allowance on a level change, the run-wide balance); documented options; determinism and snapshot round trips; the
  legacy version-0 snapshot.
- [`test/mechanics/marks/marks-differential.test.ts`](../../test/mechanics/marks/marks-differential.test.ts): the task
  lines against the old engine's texts.

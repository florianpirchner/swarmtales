# Marks

A message allowance: talking costs marks. A resident gets a budget of marks per level (or one budget for the whole
run), each channel has a price (board post, group post, direct message, shown receipt), and a message the resident
cannot afford is refused with `NO_MARKS`. Marks are not points: they cannot be transferred, they expire on a level
change, and they may come back over time. Ported from the old platform (M5-17).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-marks` |
| Id | `marks` |
| Summary | The marks a message costs and their refill. |
| Requires | none |
| Uses when loaded | `progression` (from [progression](../progression/README.md)), `channels` (from [channels](../channels/README.md)) |
| Provides | `allowance` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Where marks apply.** Marks start at `rules.fromLevel`; below it every channel is free. Later level ranges
   (`rules.ranges`) can set their own allowance, prices and refill (the City makes the Act II wall cheaper to talk on
   than Act I). `levels` overrides the allowance of single levels.
2. **The allowance.** With `perLevel` every resident gets that many marks whenever it changes level; unused marks
   expire. With `perRun` (Whispers) there is one balance for the whole run that never resets and never refills. The
   level always comes from `progression` (`levelOf`); without a progression every resident is on `startLevel`.
3. **The prices.** The mechanic has no tools of its own. It prices the tools of other mechanics by their bare names
   in its own stage handlers: `postBoard` (board), `sendDM` (DM), `postGroup` (group; free in a group of the city),
   `showReceipt` and `forgeReceipt` (receipt). Its `rule` handler refuses a call the resident cannot pay
   (`NO_MARKS`); its `after` handler books the price of a call that succeeded and writes `marks_spent` with the
   balance left. A free channel (price 0) books nothing. A Director's call is never priced.
4. **Refill.** A range with `refill` gives back `marks` every `everyMinutes` ticks, up to the allowance. The refill is
   booked lazily whenever the balance is read, in whole intervals, so it needs no job.
5. **What residents see.** The status line of every turn shows the marks left (`marks/status/marks`), and the terms
   of a level (`marks/task/marks-level`, `-refill` or `-run`) come as a line of kind `task` once per level, when
   `progression` shows the level's task (not at a shut door, not after the last level). The message tools name the
   marks left in their replies through `allowance`: `left` less `priceOf`, the price the `after` handler books for the
   same call.

**Not done here:** marks never buy anything but messages and receipt shows; points are the `ledger`'s.

## Which refusal comes first

The old platform had no price stage: each caller asked `canAfford` in its own tool body, after its own checks. Here
the price is a `rule` handler, which runs after the tool's own `rule` and before its body. So a call that breaks a
check of its tool and has no marks left reads the tool's refusal where the tool checks in `rule` (`postGroup`,
`showReceipt`), as before, and `NO_MARKS` where the tool checks in its body (`postBoard`: `INVALID_TEXT`; `sendDM`:
`UNKNOWN_AGENT`, `SELF_DM`, `EXILED`, `INVALID_TEXT`, `DM_LIMIT`). That is the registered change of errata J45 and
the first erratum of M5-17; `NO_MARKS` is logged at stage `rule` (old: `execute`). No oracle file holds a refusal of `marks`.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `marks_spent`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `channel` | "board" or "group" or "dm" or "receipt" | yes | What was paid for |
| `remaining` | number | yes | The marks left |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object | unset | The game's message allowance. |
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
| `levels` | object[] | `[]` | Allowances of single levels (the game's `levels[].marks.perLevel`). |
| `levels[].level` | integer ≥ 1 | required | The level. |
| `levels[].perLevel` | integer ≥ 0 | required | Its allowance, in place of the rules'. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident is on where no progression mechanic answers `levelOf`. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `allowance`

The marks a resident has left and what a message costs it, for the replies of the message tools.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `left` | query | resident: string | { remaining: number, budget: number } or null | The resident's marks in the current window, or null where marks do not apply (old `left` of `marks`). |
| `priceOf` | query | resident: string, channel: "board" or "group" or "dm" or "receipt" | number or null | What a message on the channel costs the resident now, or null where marks do not apply (old `priceOf` of `marks`). |

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
| [marks/status/marks](prompts/marks/status/marks.md) | `remaining`, `budget` |
| [marks/task/marks-level](prompts/marks/task/marks-level.md) | `budget`, `board`, `group`, `dm`, `receipt` |
| [marks/task/marks-level-refill](prompts/marks/task/marks-level-refill.md) | `budget`, `board`, `group`, `dm`, `receipt`, `regain` |
| [marks/task/marks-run](prompts/marks/task/marks-run.md) | `budget`, `board`, `group`, `dm`, `receipt` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), channels(), receipts({ quoteDms: true }), marks({ rules: { fromLevel: 1, perRun: 5, prices: { board: 0, group: 0, dm: 0, receipt: 1 } } })],
```

Whispers gives every resident five marks for the whole run, and only a shown receipt costs one.

## Lessons and loopholes

None recorded against this mechanic on this platform yet. On the old platform the City's marks never bound in v05
(a mark back every minute); the wall's refill of one mark every three ticks is the answer the game carries.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): every priced call and submission of five Whispers and City files played
again, with the levels of the file: the `marks_spent` of each resident, the `marks n/m` part of every status line, the
`marks n/m left` part of every reply and the terms under every task equal the file's.
[`test/marks.test.ts`](test/marks.test.ts), with the real `ledger`, `channels` and `receipts`: the first test of
M5-17 (the carried cases of a call out of marks, against the old answers, with the registered changes), the charge
and the replies, the free group of the city, the terms per level and the resume at every boundary.
[`test/book.test.ts`](test/book.test.ts): the carried rules of the allowance (ranges, refill, level change, run-wide).

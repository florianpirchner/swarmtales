# Marks

A message allowance: talking costs marks. A resident gets a budget of marks per level (or one budget for the whole
run), each channel has a price (board post, group post, DM, shown receipt), and a message the resident cannot afford
is refused with `NO_MARKS`. Marks are not points: they cannot be transferred, they expire on a level change, and they
may come back over time.

Copied from `mechanics/marks/README.md` by `scripts/export-oracles.ts`; do not edit.

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

This mechanic defines no tools.

## Events

### `marks_spent`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `channel` | "board" or "group" or "dm" or "receipt" | yes |  |
| `remaining` | number | yes |  |

## Options

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



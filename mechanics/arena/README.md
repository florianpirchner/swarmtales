# Arena

The frame of a City run, reduced to its game rules (decision A57): when the run ends and why, and what the city sees
of it. It writes `run_start` and `run_end`, the standings after every tick (`round_end`), stops the run when the game
says it is over (every resident done, the seats decided, the tribunal's act over), and brakes an act that runs too
long. The budget and the snapshot checkpoint of the old arena are the platform's now.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-arena` |
| Id | `arena` |
| Summary | The City's run frame reduced to its game rules: start and end, the standings per tick, the stop rules and the act brakes. |
| Requires | `progression` (from [progression](../progression/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `tribunal-view` (from [tribunal](../tribunal/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Start.** At the run's start, after every other mechanic's start (the arena loads last), `run_start` names the
   game's old story id, the residents, the ticks, the seed and the run's labels.
2. **Standings.** At the end of every tick, `round_end` lists every resident in ranking order (from `progression`):
   level, points, rank, the resident tools open to it now, and whether it was activated in the tick.
3. **Stop rules.** From the second tick on, the stop check runs before the tick's first pass, after the door, the
   tribunal and the script have run their tick start: the run limit `arena.stop`. It ends the run with the tribunal's
   end reason once its act is over (`tribunal-view`), with `every competitor has passed the last level` in the old words
   of `stopWhenDone`, or with `seats decided` (`stopWhenSeatsDecided`: no reward still open can change who holds the
   `survivors` seats). A tribunal under way, or a city that still pursues its target, holds the two early stops back.
   A tick that stops there writes no `round_end`.
4. **Act brakes.** An act with `maxMinutes` that has run that long with residents still inside it gets one
   `act_brake`, naming who is behind; the tribunal's act has none.
5. **End.** At the run's end, after the acts end, the open petitions fail and the treasuries settle, `run_end` carries
   the stop reason (also the one the last tick's check found when the run ran out of ticks) and the last standings.
6. **Novelty.** A resident whose points moved since the end of its last turn has news, so an `onNews` run wakes it.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `run_start`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `story` | string | yes | The game's old story id |
| `agents` | string[] | yes | Every resident, in the game's order |
| `minutes` | integer | yes | The ticks the game plays |
| `seed` | integer | yes | The seed of the run |
| `meta` | record of string | no | The run's labels |

### `round_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The old round: the tick plus one |
| `standings` | object[] | yes | Every resident in ranking order |
| `standings[].agent` | string | yes | A resident id, for example `A01` |
| `standings[].level` | integer | yes | Its level |
| `standings[].points` | number | yes | Its points |
| `standings[].rank` | integer | yes | Its place, from 1 |
| `standings[].tools` | integer | yes | The tools open to it now |
| `standings[].activated` | boolean | yes | True when it was activated in the tick |

### `act_brake`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | string | yes | The act's title |
| `fromLevel` | integer | yes | Its first level |
| `toLevel` | integer | yes | Its last level |
| `startedAt` | integer | yes | The tick it began |
| `maxMinutes` | integer | yes | Its brake, in ticks |
| `behind` | object[] | yes | Who is still inside the act |
| `behind[].agent` | string | yes | A resident id, for example `A01` |
| `behind[].level` | integer | yes | Its level |

### `run_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no | Why the run stopped, when a stop rule named it |
| `standings` | object[] | yes | Every resident in ranking order |
| `standings[].agent` | string | yes | A resident id, for example `A01` |
| `standings[].level` | integer | yes | Its level |
| `standings[].points` | number | yes | Its points |
| `standings[].rank` | integer | yes | Its place, from 1 |
| `standings[].tools` | integer | yes | The tools open to it now |
| `standings[].activated` | boolean | yes | True when it was activated in the tick |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `story` | string | `""` | The game's old story id, as `run_start` names it. |
| `meta` | record of string | unset | The run's labels, logged in `run_start`. |
| `stopWhenDone` | boolean | `false` | End the run as soon as every resident in the city has passed the last level. |
| `stopWhenSeatsDecided` | boolean | `false` | End the run once open rewards can no longer change who survives. |
| `rewards` | object[] | `[]` | The reward of every level: what is still open to a resident, for `stopWhenSeatsDecided`. |
| `rewards[].level` | integer ≥ 1 | required | A level number |
| `rewards[].reward` | number | required | Its reward |
| `acts` | object[] | `[]` | The acts in the game's order, for their brakes. |
| `acts[].title` | string | required | The act's title |
| `acts[].fromLevel` | integer ≥ 1 | required | A level number |
| `acts[].maxMinutes` | integer ≥ 1 | unset | The act's brake: ticks after its start before `act_brake` is written. |
| `tribunalAct` | integer ≥ 1 | unset | The first level of the tribunal's act: the tribunal ends that act, it has no brake. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic has no prompt files.

<!-- /generated:prompts -->

## Example

The arena loads last, after `progression` and `ledger`, which it requires:

```ts
mechanics: [ledger(), channels(), puzzles(), progression({ levels }), exile(), tribunal(), runFrame({ story: "cityofkeys", stopWhenDone: true, stopWhenSeatsDecided: true })],
```

The package exports the mechanic as `runFrame`: the name lint retires the word of its id in exported identifiers. The
tribunal provides what the stop rule reads by importing the `/contract` entry:

```ts
import { TribunalViewService } from "@swarmtales/mechanic-arena/contract";
```

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

What the port of M5-33 changed against the old platform: the budget (`budgetUsd`, the old `arena.budget` limit), the
snapshot cut (`snapshot`, the fact `arena.snapshot`, the brake's checkpoint) and the ending evaluator (`ending`, no
provider) are not ported; the old turn order and input kinds are the scheduler's (`order: "arena"`); the version-0
migration is not carried (A56). The novelty compares the points at the end of a resident's turn, which is the old
rule at block size 1 (both games); at larger blocks the old rule kept what earlier members of the block did as news.

## Tests

Offline, with the real `ledger`, `channels` and `progression` and stand-ins for the pieces and the tribunal.
`test/arena.test.ts`: the run's lines, each stop rule at the next tick's start, the last tick's reason, the tribunal's
end and its hold, the act brake, the points novelty, and a resume at every boundary. `test/oracle.test.ts`: the
oracle files' `run_start` byte for byte, the key order of every standings row, the rounds and the end by
`arena.stop`.

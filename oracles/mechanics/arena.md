# Arena

The frame of a city run: when it starts and ends, and why. It writes `run_start` and `run_end`, the standings after
every minute (`round_end`), and stops the run when the story says it is over (everyone done, the seats decided, the
budget spent). It also brakes an act that runs too long and tells the app when to take the Act I checkpoint.

Copied from `mechanics/arena/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Start.** `run_start` is written after every other mechanic's start, with the story's id and the run's labels
   (`meta`).
2. **Every minute.** After the minute's turns `round_end` carries the standings. The arena's `news` hook counts new
   points as news, so the `onNews` activation wakes a resident whose balance changed.
3. **Stopping.** The host asks the arena's referee limits after each minute: with `stopWhenDone` the run ends once
   every resident in the city has passed the last level; with `stopWhenSeatsDecided` once the open `rewards` can no
   longer change who survives; with `budgetUsd` once the run's model spend (the app's `usage` events) exceeds it. The
   fact `stopping` tells the app to skip the weaver and the gamemaker once the run will stop.
4. **Act brakes.** An act with `maxMinutes` logs `act_brake` that many minutes after its start (the tribunal's act has
   no brake; the tribunal ends it).
5. **Checkpoint.** With `snapshot` the fact `snapshot` says when to take `host.snapshot()`: once every resident has
   passed `afterLevel` (or at `atMinute`), optionally stopping the run there. This is how the Act I checkpoints under
   `examples/` are made.
6. **End.** `run_end` carries the reason (the arena's own, or the text the app passed to `host.stop`) and, when a
   mechanic provides the `ending` API, the run's ending.

The arena has no tools and keeps the old engine's turn order (`legacyTurnOrder`) for the city stories.

## Tools

This mechanic defines no tools.

## Events

### `run_start`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `story` | string | yes |  |
| `agents` | string[] | yes |  |
| `minutes` | integer | yes |  |
| `seed` | integer | yes |  |
| `meta` | record of string | no |  |

### `round_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes |  |
| `standings` | object[] | yes |  |
| `standings[].agent` | string | yes |  |
| `standings[].level` | integer | yes |  |
| `standings[].points` | number | yes |  |
| `standings[].rank` | integer | yes |  |
| `standings[].tools` | integer | yes |  |
| `standings[].activated` | boolean | yes |  |

### `act_brake`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | string | yes |  |
| `fromLevel` | integer | yes |  |
| `toLevel` | integer | yes |  |
| `startedAt` | integer | yes |  |
| `maxMinutes` | integer | yes |  |
| `behind` | object[] | yes |  |
| `behind[].agent` | string | yes |  |
| `behind[].level` | integer | yes |  |
| `snapshot` | boolean | no |  |

### `run_end`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no |  |
| `standings` | object[] | yes |  |
| `standings[].agent` | string | yes |  |
| `standings[].level` | integer | yes |  |
| `standings[].points` | number | yes |  |
| `standings[].rank` | integer | yes |  |
| `standings[].tools` | integer | yes |  |
| `standings[].activated` | boolean | yes |  |
| `ending` | object | no |  |
| `ending.id` | string | yes |  |
| `ending.title` | string | yes |  |
| `ending.summary` | string | no |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `story` | string | required | The story's id, as `run_start` names it (the old `world.story.id`). |
| `meta` | record of string | unset | The run's labels, logged in `run_start` (the old `ArenaOptions.meta`). |
| `stopWhenDone` | boolean | `false` | End the run as soon as every resident in the city has passed the last level. |
| `stopWhenSeatsDecided` | boolean | `false` | End the run once open rewards can no longer change who survives. |
| `rewards` | object[] | `[]` | The reward of every level of the story (`levels[].reward`): what is still open to a resident, for `stopWhenSeatsDecided`. |
| `rewards[].level` | integer ≥ 1 | required |  |
| `rewards[].reward` | number | required |  |
| `acts` | object[] | `[]` | The story's acts in its order (`story.acts`), for their brakes. |
| `acts[].title` | string | required |  |
| `acts[].fromLevel` | integer ≥ 1 | required |  |
| `acts[].maxMinutes` | integer ≥ 1 | unset | The act's brake: minutes after its start before the run logs `act_brake` (v08). |
| `tribunalAct` | integer ≥ 1 | unset | The first level of the tribunal's act (`tribunal.act`, else the start level): the tribunal ends that act, it has no brake. |
| `budgetUsd` | number ≥ 0 | unset | End the run once this run's model spend (its `usage` app events) exceeds it (`run.budgetUsd`). |
| `snapshot` | object | unset | The run snapshot the app takes once every resident has passed `afterLevel` (SPEC 17); the fact `arena.snapshot` says when. |
| `snapshot.afterLevel` | integer ≥ 1 | required |  |
| `snapshot.atMinute` | integer ≥ 0 | unset | Due at the first minute's end at or after this minute instead. |
| `snapshot.stop` | boolean | required | End the run right after the snapshot. |
| `snapshot.file` | string | required | Where the app writes the snapshot, for the run's end reason. |



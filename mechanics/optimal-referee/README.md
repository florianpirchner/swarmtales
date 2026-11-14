# Optimal referee

A silent judge for the grid game. It scores every move against exact minimax play and writes the score as
`move_scored`, for the human and the report only. No resident and no Director ever learns how a move was rated. It
has no tools.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-optimal-referee` |
| Id | `optimal-referee` |
| Summary | Scores every grid-game move against minimax (value before and after, class); read-only, for the human and the reporter. |
| Requires | `grid-game` (from [grid-game](../grid-game/README.md)) |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [tictactoe-teams](../../games/tictactoe-teams/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Listening.** On every `move_played` of the [grid-game](../grid-game/README.md) it reads the position before the
   move through the `grid-game` service.
2. **Scoring.** It computes the minimax value of every free cell and compares the played one with the best: optimal,
   or a missed win, a missed block, a blunder. Only positions where an error was possible are scored: where every free
   cell is worth the same (the empty board is a draw, a lost position loses anyway) nothing is written.
3. **Limits.** Positions with more than `maxEmptyCells` free cells are not scored, since minimax on a big board is slow.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `move_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `moveNo` | integer | yes | The scored move's number in its game, as in move_played. |
| `side` | "X" or "O" | yes |  |
| `value_before` | integer ≥ -1 ≤ 1 | yes |  |
| `value_after` | integer ≥ -1 ≤ 1 | yes |  |
| `class` | "optimal" or "blunder" or "missed_win" or "missed_block" | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxEmptyCells` | integer ≥ 2 ≤ 16 | `9` | Positions with more free cells than this are not scored (minimax on a big board is slow). |

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

From [`games/tictactoe-teams/game.ts`](../../games/tictactoe-teams/game.ts):

```ts
optimalReferee({ maxEmptyCells: Math.min(16, size * size) }),
```

On a board with more than 16 cells only the late positions (16 free cells or fewer) are scored.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P84** Haiku draws 4 x 4 as well, and the referee scores few moves. Open.

## Tests

[`test/optimal-referee.test.ts`](test/optimal-referee.test.ts): no score where no error is possible, the only saving
reply, missed wins and blocks, lost positions, the audience of `move_scored`, no tools, determinism and snapshots, a
whole game from the empty board. [`test/carried.test.ts`](test/carried.test.ts) holds the options, the event and its
audience to those of the old platform.

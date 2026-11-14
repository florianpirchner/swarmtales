# Optimal referee

A silent judge for the grid game. It scores every move against exact minimax play and writes the score as
`move_scored`, for the human and the reporter only. No resident and no gamemaker ever learns how a move was rated. It
has no tools.

Copied from `mechanics/optimal-referee/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Listening.** On every `move_played` of the grid-game it reads the position before the
   move through the `grid-game` API.
2. **Scoring.** It computes the minimax value of every free cell and compares the played one with the best: optimal,
   or a missed win, a missed block, a blunder. Only positions where an error was possible are scored: where every free
   cell is worth the same (the empty board is a draw, a lost position loses anyway) nothing is written.
3. **Limits.** Positions with more than `maxEmptyCells` free cells are not scored, since minimax on a big board is slow.

## Tools

This mechanic defines no tools.

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxEmptyCells` | integer ≥ 2 ≤ 16 | `9` | Positions with more free cells than this are not scored (minimax on a big board is slow). |



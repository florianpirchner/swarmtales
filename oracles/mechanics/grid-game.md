# Grid game

A small board game between two teams: tic-tac-toe by default, or any square board up to 10 x 10 with a line length to
win (4 x 4 with four in a row, 5 x 5 ...). The mechanic owns the board, whose move it is, win and draw, the game
counter and the alternating start, over a match of several games. It knows nothing about team talk, memory or the
quality of moves; other mechanics add those.

Copied from `mechanics/grid-game/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The match.** `games` games are played; with `alternateStart` X starts game 1 and the starting side alternates.
   Each game writes `game_started`, every move `move_played`, the end `game_ended`, and after the last game
   `match_ended` ends the run through the referee limit.
2. **Teams and captains.** `teams` gives the X and O members (without it the residents are split in half). The
   captaincy rotates one move each through the team (or stays with the first member, `fixedCaptain`). With `wakeTeam`
   every member of the team on move has news, so the others can advise and vote.
3. **Moves.** `viewBoard` shows every cell as its mark plus its number, so a taken cell keeps its number. `playMove` is
   locked and open only for the captain of the turn; a taken or unknown cell is refused. Another mechanic can gate the
   move further with a `rule` handler: consensus makes the team vote first.
4. **Interfaces.** The `grid-game` API gives the board to other mechanics (the optimal-referee
   scores moves from it); `consensus-source` tells `consensus` who is on move, who is captain and which cells are legal,
   and plays a forfeit; it also holds and releases games for the strategy-brain's retro.

## Tools

### `viewBoard`

- Suggested for: `resident`

No parameters.

What the caller reads (grid-game/tools/viewBoard):

> Look at the board: the cells (numbered from 0, row by row), whose side moves, who is the captain of the turn and which game of the match it is.

### `playMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `cell` | integer ≥ 0 | yes | The cell to mark, from 0, row by row. |

What the caller reads (grid-game/tools/playMove):

> Play a move on the board: put your side's mark on a free cell, given by its number. Only the captain of the turn may call this, and only while their side is to move.

## Events

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `startingSide` | "X" or "O" | yes |  |
| `xTeam` | string[] | yes |  |
| `oTeam` | string[] | yes |  |

### `move_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `side` | "X" or "O" | yes |  |
| `by` | string | yes | The captain who played the move. |
| `cell` | integer | yes |  |
| `moveNo` | integer | yes | The move's number in its game, from 1. |
| `forfeit` | boolean | yes | True when the move was played for the team by the move timer (a random legal cell), not by its captain. |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `result` | "X" or "O" or "draw" | yes |  |
| `winLine` | integer[] | no |  |
| `moves` | integer[] | yes | Every cell of the game in the order played. |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tally` | object | yes |  |
| `tally.X` | integer | yes |  |
| `tally.O` | integer | yes |  |
| `tally.draw` | integer | yes |  |
| `invalid` | boolean | no | True when the match was ended as invalid (only consensus forfeits were played); the tally is no result. |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | integer ≥ 2 ≤ 10 | `3` | The board is size x size cells. |
| `line` | integer ≥ 2 ≤ 10 | `3` | How many marks in a row (line, column or diagonal) win a game; at most the board size. |
| `games` | integer ≥ 1 | `3` | How many games the match has; the run ends after the last one. |
| `alternateStart` | boolean | `true` | The starting side alternates from game to game (X starts game 1); false: X always starts. |
| `fixedCaptain` | boolean | `false` | The first member of each team is its captain for the whole match; false: the captaincy rotates, one move each. |
| `wakeTeam` | boolean | `false` | With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain. |
| `teams` | object | unset | The two teams; without it the residents are split in half, the first half playing X. |
| `teams.X` | string[] | required | Resident ids of the X team, in the order their captaincy rotates. |
| `teams.O` | string[] | required | Resident ids of the O team, in the order their captaincy rotates. |



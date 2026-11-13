# grid-game

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-grid-game` |
| Id | `grid-game` |
| Summary | A board game between two teams: the board, the captain of the turn, win detection and a match of several games. |
| Requires | none |
| Uses when loaded | `consensus` (from [consensus](../consensus/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `grid-game`, `consensus-source` |
| State | kept, snapshot slice version 1 |
| Facts | `captain`, `tally` |
| Jobs | `nextGame` |
| Stories | [tictactoe-teams](../../stories/tictactoe-teams/README.md) (all 5 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewBoard`

- Suggested for: `resident`

No parameters.

What the caller reads ([grid-game/tools/viewBoard](prompts/grid-game/tools/viewBoard.md)):

> Look at the board: the cells (numbered from 0, row by row), whose side moves, who is the captain of the turn and which game of the match it is.

### `playMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `cell` | integer ≥ 0 | yes | The cell to mark, from 0, row by row. |

What the caller reads ([grid-game/tools/playMove](prompts/grid-game/tools/playMove.md)):

> Play a move on the board: put your side's mark on a free cell, given by its number. Only the captain of the turn may call this, and only while their side is to move.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `grid-game`

The board of the grid game: the side to move, the captain of the turn, the cells and the game's number.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `side` | query | - | "X" or "O" or null | The side to move, or null when no game is running. |
| `captain` | query | - | string or null | The resident who may play the next move, or null when no game is running. |
| `board` | query | - | ("X" or "O" or ".")[] | The cells, row by row: X, O or '.' for a free cell. |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back (also the first, before the run starts) until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start in the next minute. A no-op when nothing is held. |
| `rules` | query | - | object | The board's size and the line length that wins. |

### `consensus-source`

The team on move, its captain, its legal cells and a forfeit move, for the consensus gate.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `team` | query | - | string | The team on move now; an empty string when no team may act. |
| `captain` | query | - | string | The resident who proposes for the team on move; an empty string when there is none. |
| `legalCells` | query | - | integer[] | The values the gated parameter may take for the team on move (empty when none or no team is on move). |
| `playForfeit` | command | cell: integer | boolean | Plays `cell` for the team on move as a forfeit (the move timer ran out). False when it could not be played. |
| `invalidate` | command | reason: string | boolean | Ends the match as invalid (nobody played it; forfeits only) so the run ends. False when the match is already over. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [grid-game/tools/viewBoard](prompts/grid-game/tools/viewBoard.md) | - |
| [grid-game/tools/playMove](prompts/grid-game/tools/playMove.md) | - |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._

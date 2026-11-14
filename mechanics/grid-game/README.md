# Grid game

A small board game between two teams: tic-tac-toe by default, or any square board up to 10 x 10 with a line length to
win (4 x 4 with four in a row, 5 x 5 ...). The mechanic owns the board, whose move it is, win and draw, the game
counter and the alternating start, over a match of several games. It knows nothing about team talk, memory or the
quality of moves; other mechanics add those.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-grid-game` |
| Id | `grid-game` |
| Summary | A board game between two teams: the board, the captain of the turn, win detection and a match of several games. |
| Requires | none |
| Uses when loaded | `consensus` (from [consensus](../consensus/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `grid-game`, `consensus-source` |
| State | kept, snapshot slice version 1 |
| Games | [hello](../../games/hello/README.md), [tictactoe-teams](../../games/tictactoe-teams/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The match.** `games` games are played; with `alternateStart` X starts game 1 and the starting side alternates.
   Each game writes `game_started`, every move `move_played`, the end `game_ended`, and after the last game
   `match_ended`; the run limit `grid-game.match` then ends the run.
2. **Teams and captains.** `teams` gives the X and O members (without it the residents are split in half). The
   captaincy rotates one move each through the team (or stays with the first member, `fixedCaptain`). With `wakeTeam`
   every member of the team on move has news, so the others can advise and vote.
3. **Moves.** `viewBoard` shows every cell as its mark plus its number, so a taken cell keeps its number. `playMove` is
   locked and open only for the captain of the turn; a taken or unknown cell is refused. Another mechanic can gate the
   move further with a `rule` handler of the tool pipeline: [consensus](../consensus/README.md) makes the team vote
   first.
4. **Interfaces.** The `grid-game` service gives the board to other mechanics (the
   [optimal-referee](../optimal-referee/README.md) scores moves from it), and holds and releases games for the retro
   of the [strategy-brain](../strategy-brain/README.md). `consensus-source` tells `consensus` who is on move, who is
   captain and which cells are legal, and plays a forfeit.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewBoard`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([grid-game/tools/viewBoard](prompts/grid-game/tools/viewBoard.md)):

> Look at the board: the cells (numbered from 0, row by row), whose side moves, who is the captain of the turn and which game of the match it is.

### `playMove`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `cell` | integer ≥ 0 | yes | The cell to mark, from 0, row by row. |

What the caller reads ([grid-game/tools/playMove](prompts/grid-game/tools/playMove.md)):

> Play a move on the board: put your side's mark on a free cell, given by its number. Only the captain of the turn may call this, and only while their side is to move.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| [grid-game/tools/viewBoard](prompts/grid-game/tools/viewBoard.md) | - |
| [grid-game/tools/playMove](prompts/grid-game/tools/playMove.md) | - |

<!-- /generated:prompts -->

## Example

From [`games/tictactoe-teams/game.ts`](../../games/tictactoe-teams/game.ts):

```ts
gridGame({ size, line, games, alternateStart: true, teams, wakeTeam: true, fixedCaptain }),
consensus({ tool: "playMove", param: "cell", rule: "majority", maxRounds, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 4, teams }),
```

Three residents per team, every move voted; the board size and the line length are options of the game. The smallest
use is in [`games/hello/game.ts`](../../games/hello/game.ts): one resident per side, one game.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P77, P84** Haiku already plays tic-tac-toe perfectly and draws 4 x 4 as well, so the referee scores few moves.
  Open (the reason for bigger boards and other games).
- **P81, P86, P88** forfeits decide games with weaker models (Gemma, GLM on big boards). P88 fixed, the rest open.
- **P410** a captain left on a stale board was never asked again. Fixed.
- **P332** a team of three beats one resident of the same model only slightly, at 3.4 times the cost. Open.

## Tests

[`test/grid-game.test.ts`](test/grid-game.test.ts): a match with win, draw and alternating start, captains (rotating,
fixed), default teams and bad teams, the locked `playMove` and its rule-stage check, the end of the match, briefings
and forfeits, determinism and snapshots mid-game and between games. [`test/rules.test.ts`](test/rules.test.ts): lines
on boards of any size and the board text. [`test/carried.test.ts`](test/carried.test.ts) holds the prompt files,
tools, options, events, service and state schemas to those of the old platform.

# Morris

Nine men's morris between two teams (or a team and a built-in engine) over a match of several games. The mechanic
owns the board of 24 points, the pieces in hand, mills and removals, and the end of a game; a move is one number, and
a step that closes a mill is followed by a second move that names the piece to remove, so a team votes on each part on
its own.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-morris` |
| Id | `morris` |
| Summary | Nine men's morris between two teams: placing, moving and flying, mills and removals, the captain of the turn and a match of several games. |
| Requires | none |
| Uses when loaded | `consensus` (from [consensus](../consensus/README.md)), `consensus-agreed` (from [consensus](../consensus/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)), `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `consensus-source`, `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [morris-teams](../../games/morris-teams/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Moves as numbers.** A placement is the point (1-24); a move along a line or a flight is `from * 100 + to`.
   `viewBoard` shows the numbered board and, for the team on move, what it may play. `playMove` is locked and open for
   the captain of the turn only (rotating, or `fixedCaptain`); [consensus](../consensus/README.md) gates it further.
2. **Phases.** Each side places its `pieces`, then moves them to free neighbours; with `flying` a side with three pieces
   left may move to any free point. A step that closes a mill keeps the same side and captain on move for the removal
   (a piece outside a mill, or any piece when all are in mills).
3. **The end of a game.** A side loses when it is down to two pieces or blocked (never while placing). A game is a
   draw by `repetitions` of a position, after `maxQuietTurns` whole turns without a mill once all pieces are placed, or
   at `maxTurns`. `game_ended` gives the result; after `games` games `match_ended` and the run limit `morris.match`
   end the run. The starting side alternates (`alternateStart`).
4. **The engine.** With `engine` one side has no residents: an alpha-beta search of `depth` whole turns (ties broken by
   the seeded random stream `("morris", "engine", game, turn)`, `maxNodes` per depth) plays its whole turn, step and
   removal, the moment it comes on move. Its moves are `move_played` events with `by: "engine"`.
5. **Plugs.** It provides `consensus-source` (who is on move, legal moves, forfeits) and `brain-source` (the retro of
   the [strategy-brain](../strategy-brain/README.md) between games), and tells the brain when a game starts and ends.
   The captain on move gets one line per turn and tick that it is on move. Moves are scored by the separate
   [morris-referee](../morris-referee/README.md), which imports the rules from `/rules` and the events and the
   search's `scoreTurn` and `classify` from `/contract`.
6. **The fake driver.** `playMove` has a `sample`: the captain of the turn plays the number its team agreed on (read
   from `consensus-agreed`), or a random legal number when no consensus gate is loaded. `viewBoard` is sampled now and
   then for a member of the team on move that is not its captain.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewBoard`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([morris/tools/viewBoard](prompts/morris/tools/viewBoard.md)):

> Look at the board: the 24 points (a free point shows its number, a piece its side), whose side moves, who is the captain of the turn, the pieces on the board and in hand, and the legal moves with their move numbers.

### `playMove`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `move` | integer ≥ 1 | yes | The move number: a point 1-24 to place on or to remove, or from * 100 + to to move a piece. |

What the caller reads ([morris/tools/playMove](prompts/morris/tools/playMove.md)):

> Play a move by its number: a free point (1-24) to place a piece on, from * 100 + to to move a piece (for example 1011 moves the piece on 10 to 11), or, right after your side closed a mill, the point of the opposing piece to remove. Only the captain of the turn may call this, and only while their side is to move.

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
| `pieces` | integer | yes | Pieces per side at the start. |
| `flying` | boolean | yes | Whether a side with three pieces may fly. |

### `move_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `side` | "X" or "O" | yes |  |
| `by` | string | yes | The captain who played the move (also for a forfeit). |
| `kind` | "place" or "move" or "fly" or "remove" | yes |  |
| `code` | integer | yes | The move number as played (p, p*100+q, or the removed point). |
| `from` | integer ≥ 1 ≤ 24 | no | A point of the board, 1-24. |
| `to` | integer ≥ 1 ≤ 24 | yes | A point of the board, 1-24. |
| `mill` | boolean | yes | True when the step closed a mill, so a removal of the same side follows. |
| `turnNo` | integer | yes | The turn's number in its game, from 1; a removal shares the number of the step that closed the mill. |
| `forfeit` | boolean | yes | True when the move was played for the team by the move timer (a random legal move), not by its captain. |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `result` | "X" or "O" or "draw" | yes |  |
| `reason` | "pieces" or "blocked" or "repetition" or "quiet" or "turn_limit" | yes |  |
| `turns` | integer | yes | Whole turns played (a step with its removal is one). |
| `pieces` | object | yes | Pieces left on the board and in hand. |
| `pieces.X` | integer | yes |  |
| `pieces.O` | integer | yes |  |
| `moves` | integer[] | yes | Every move number of the game in the order played, removals included. |

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
| `games` | integer ≥ 1 | `3` | How many games the match has; the run ends after the last one. |
| `pieces` | integer ≥ 3 ≤ 12 | `9` | Pieces per side (9 in nine men's morris). |
| `flying` | boolean | `true` | A side with three pieces left may move a piece to any free point. |
| `maxTurns` | integer ≥ 1 | `120` | Whole turns (both sides) after which a game is a draw. |
| `maxQuietTurns` | integer ≥ 1 | `40` | Whole turns without a mill, once both sides have placed every piece, after which a game is a draw. |
| `repetitions` | integer ≥ 2 | `3` | A game is a draw when the same position (with the same side to move) comes up this often. |
| `alternateStart` | boolean | `true` | The starting side alternates from game to game (X starts game 1); false: X always starts. |
| `fixedCaptain` | boolean | `false` | The first member of each team is its captain for the whole match; false: the captaincy rotates, one turn each. |
| `wakeTeam` | boolean | `false` | With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain. |
| `teams` | object | unset | The two teams; without it the residents are split in half, the first half playing X (all of them play X when the engine plays O, and the other way round). |
| `teams.X` | string[] | required | Resident ids of the X team, in the order their captaincy rotates (empty when the engine plays X). |
| `teams.O` | string[] | required | Resident ids of the O team, in the order their captaincy rotates (empty when the engine plays O). |
| `engine` | object | unset | A scripted opponent: this side has no residents and plays the best turn of an alpha-beta search (ties broken by the seeded random), the moment it comes on move. |
| `engine.side` | "X" or "O" | required | The side the engine plays; its team has no residents. |
| `engine.depth` | integer ≥ 1 ≤ 6 | `3` | Whole turns the engine's search looks ahead at most. |
| `engine.maxNodes` | integer ≥ 1000 | `200000` | Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `consensus-source`

The team on move, its captain, its legal cells and a forfeit move, for the consensus gate.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `team` | query | - | string | The team on move now; an empty string when no team may act. |
| `captain` | query | - | string | The resident who proposes for the team on move; an empty string when there is none. |
| `legalCells` | query | - | integer[] | The values the gated parameter may take for the team on move (empty when none or no team is on move). |
| `playForfeit` | command | cell: integer | boolean | Plays `cell` for the team on move as a forfeit (the move timer ran out). False when it could not be played. |
| `invalidate` | command | reason: string | boolean | Ends the match as invalid (nobody played it; forfeits only) so the run ends. False when the match is already over. |

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `morris.games` | Games played | games | `game_ended` |
| `morris.xWinShare` | Games won by X | - | `game_ended` |
| `morris.drawShare` | Games drawn | - | `game_ended` |
| `morris.blockedShare` | Games ended by a blockade | - | `game_ended` |
| `morris.turns` | Turns per game | turns | `game_ended` |
| `morris.forfeits` | Moves played by the move timer | moves | `move_played` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [morris/tools/viewBoard](prompts/morris/tools/viewBoard.md) | - |
| [morris/tools/playMove](prompts/morris/tools/playMove.md) | - |

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: nine men's morris comes with its own issue. It will load it as the old
platform did (the test game of [`test/support.ts`](test/support.ts) does so already):

```ts
morris({ games, maxTurns, maxQuietTurns, alternateStart: true, teams, wakeTeam: true, fixedCaptain, engine: { side: "O", depth: 3, maxNodes: 200_000 } }),
consensus({ tool: "playMove", param: "move", rule: "majority", maxRounds, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 6, teams: playing }),
```

With `engine` the residents all play the other side, and the gate, the chat and the brain know that team only. The
order of a turn's lines is the game's: `inputs: [{ kind: "context-reset" }, { source: "strategy-brain" },
{ source: "morris" }, { source: "team-channel" }, { source: "consensus" }]` on the scheduler `turns`.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there. Morris is closed as an experiment.

- **P100** nine men's morris takes ten times the calls of tic-tac-toe. Open.
- **P101** residents misread the ASCII board. Fixed in code, untested live.
- **P104** a resident that ended its turn on a stale board was never asked again. Fixed.
- **P107** the engine walled itself in. Fixed. **P200** Haiku walls itself in against a search that plans for it. Open.
- **P108** Haiku cannot finish three flying pieces. Open.
- **P105, P106, P109, P202, P402** no brain effect, solo, against the engine, or with Sonnet and Opus.
- **P400, P401** stronger models beat the depth-3 engine more often but still lose most games; the blockade weakness
  is Haiku's.

## Tests

[`test/rules.test.ts`](test/rules.test.ts) (carried): the rules (24 points, 16 mills, move numbers, removals, steps,
flights, losing), documented options and the package name. [`test/oracle.test.ts`](test/oracle.test.ts): the five
oracle files of `oracles/morris-teams/` at level 3 inside the test game, with the morris-referee's setup entry and its
`move_scored` events taken out (the referee is a port of its own). [`test/morris.test.ts`](test/morris.test.ts): what
no oracle file reaches (bad teams, a fixed captain, the turn limit, the engine as X), the fake driver through the
consensus gate, and a snapshot in the middle of a game. [`test/carried.test.ts`](test/carried.test.ts) holds the
prompt files, tools, options and events to those of the old platform.

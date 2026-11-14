# Chess

A match of chess games between two seats (two solo residents, or two teams with a rotating captain). The model never
changes the board itself: it writes its move as text and chess.js checks it,
plays it or refuses it, and ends the game. A move cap, a forfeit clock and resignation keep every game finite, and
every move is scored for the human against a cheap material baseline that the seats never see.

Copied from `mechanics/chess/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Start.** At the run's start the first game begins (`game_started`), unless a strategy brain holds it back for
   the seats to write their plans first (`brain-source.hold`). The colours swap from game to game
   (`alternateColours`); the first seat is White in game 1.
2. **On move.** Only the seat (or team captain) on move has news, so the other side sleeps while one side thinks.
   Its turn shows the position: the board (spaced grid with every move so far, or with `compactBoard` a compact grid
   with the last `compactMoves` half-moves), whose move it is, check, the material, and, when the story turns them
   on, every legal move (`showLegalMoves`) and each side's loose pieces (`showThreats`). With `freshContext` the seat
   starts every half-move from a fresh context: the rules, its brain, its own last note and the position.
3. **A move.** `playMove` takes SAN (`Nf3`, `O-O`, `e8=Q`) or from and to squares (`g1f3`). A legal move is played
   (`move_played`) and ends the seat's turn. An illegal or unreadable move is refused with a hint that names the legal
   moves of the piece written (never the whole list, LH13); the board stays as it was and the refusal is logged for
   the human only (`move_refused`). `resign` gives the game to the opponent.
4. **Forfeits.** A seat that ends `maxIdleTurns` turns in a row on move without a legal move gets a seeded random
   legal move played for it (`forfeit: true`). `maxForfeits` such moves in one game lose that game.
5. **End of a game.** chess.js ends a game on checkmate, stalemate, threefold repetition, the fifty-move rule or
   insufficient material. At `maxPlies` half-moves the game is stopped and scored on material: a lead of
   `adjudicateMargin` or more wins, anything less is a draw. With `settleCap` the side to move is first credited with
   the best single capture it has, so a grab on the last half-move into a recapture that never comes does not count
   (LH17). `game_ended` carries the result, the move list and the PGN.
6. **Between games.** With a strategy brain loaded, the brain's retro runs before the next game (the chess mechanic
   tells it the game's end through `strategy-brain.gameEnd` and passes the game's moves so the brain's replay check
   can spot move lists). With `coach`, each side gets a private review of its own worst moves by the baseline in that
   retro (`coach_review`). After the last game `match_ended` gives the score and the run ends.

**Teams.** With `teams` each side is a list of residents; the captaincy rotates one move per member. With `wakeTeam`
every member of the side on move gets one turn per half-move to advise in the team chat (`team-channel`).

**Scoring for the human.** `move_scored` compares every move with the best move by a one-ply search with a static
exchange check (pawn 1, queen 9). It sees hanging pieces and missed free captures, nothing deeper; it is not an
engine (P111). The engine reference is `pnpm lab:chess` (Garbochess-JS, see `stories/chess/README.md`), run after the match.

**Not done here:** no clock in seconds (the run's turns are the clock), no engine opponent (that is a separate
referee mechanic in other games), no draw offers.

## Tools

### `viewBoard`

- Suggested for: `resident`

No parameters.

What the caller reads (chess/tools/viewBoard):

> Look at the chess board: the position (White at the bottom), whose move it is, the moves of the game so far, the material, and the game's number in the match.

### `playMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `move` | string | yes | The move: SAN (Nf3, exd5, O-O, e8=Q) or from and to squares (g1f3, e7e8q). |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (chess/tools/playMove):

> Play your move in the chess game, only when it is your move. Write it in standard algebraic notation (Nf3, exd5, O-O, e8=Q) or as from and to squares (g1f3, e7e8q). An illegal or unreadable move is refused and you may try again; the board does not change.

### `resign`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (chess/tools/resign):

> Resign the running game, only when it is your move. The opponent wins the game; the match goes on with the next game.

## Events

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `white` | string | yes |  |
| `black` | string | yes |  |

### `move_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `ply` | integer | yes | The half-move's number in its game, from 1. |
| `colour` | "white" or "black" | yes |  |
| `by` | string | yes |  |
| `san` | string | yes |  |
| `written` | string | yes | The move as the seat wrote it ('' for a forfeit move). |
| `fen` | string | yes | The position after the move. |
| `forfeit` | boolean | yes |  |

### `move_refused`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `ply` | integer | yes |  |
| `colour` | "white" or "black" | yes |  |
| `by` | string | yes |  |
| `written` | string | yes |  |
| `count` | integer | yes | The seat's refused moves in this game so far, this one included. |

### `move_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `ply` | integer | yes |  |
| `colour` | "white" or "black" | yes |  |
| `by` | string | yes |  |
| `san` | string | yes |  |
| `best` | string | yes |  |
| `bestValue` | number | yes |  |
| `playedValue` | number | yes |  |
| `loss` | number | yes |  |
| `class` | "good" or "inaccuracy" or "mistake" or "blunder" | yes |  |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `white` | string | yes |  |
| `black` | string | yes |  |
| `result` | "1-0" or "0-1" or "1/2-1/2" | yes |  |
| `reason` | "checkmate" or "stalemate" or "threefold_repetition" or "fifty_moves" or "insufficient_material" or "move_cap" or "forfeits" or "resignation" | yes |  |
| `plies` | integer | yes |  |
| `moves` | string[] | yes |  |
| `illegal` | record of integer | yes |  |
| `forfeits` | record of integer | yes |  |
| `resigned` | string | no |  |
| `pgn` | string | yes |  |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

### `coach_review`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `side` | string | yes |  |
| `losses` | integer | yes | The side's moves that lost material by the baseline (loss 1 or more). |
| `text` | string | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 | `2` | How many games the match has; the run ends after the last. |
| `alternateColours` | boolean | `true` | The colours swap from game to game (the first seat is White in game 1); false: the first seat is always White. |
| `maxPlies` | integer ≥ 2 | `160` | Half-moves after which a game is stopped and scored on material. |
| `adjudicateMargin` | integer ≥ 1 | `3` | At the move cap, the side ahead by at least this much material (pawn 1, queen 9) wins; else a draw. |
| `maxIdleTurns` | integer ≥ 1 | `3` | Turns in a row on move without a legal move before a random legal move is played for the seat. |
| `maxForfeits` | integer ≥ 0 | `3` | Forfeit moves in one game that lose it; 0: never. |
| `showLegalMoves` | boolean | `false` | The position shown to the seat on move lists every legal move (off: the list comes only with a refused move). |
| `showThreats` | boolean | `false` | The position shown to every seat lists each side's loose pieces: attacked and undefended, or attacked by a cheaper piece (a static check, no pins). |
| `score` | boolean | `true` | Score every move against the material baseline (`move_scored`, for the human). |
| `teams` | record of string[] | unset | The two sides by name, each with its members in the order the captaincy rotates (one move each). Default: each of the two residents is a side of its own, named by its id. |
| `coach` | boolean | `false` | After each game, every side gets a private review of its own worst moves by the material baseline, shown in its next brain retro (needs a strategy brain). |
| `coachMoves` | integer ≥ 1 | `3` | How many of a side's worst moves the coach's review names. |
| `wakeTeam` | boolean | `false` | Every member of the side on move gets one turn per half-move to advise its captain in the team chat; false: only the captain has news. |
| `freshContext` | boolean | `false` | The seat on move starts every half-move from a fresh context: the rules, its strategy brain, the note it gave with its last move, and the position (false: the context is dropped only between games). |
| `compactBoard` | boolean | `false` | The position is shown as a compact grid without spaces and only the last moves (false: the spaced grid and the whole move list). |
| `compactMoves` | integer ≥ 1 | `12` | Half-moves the compact board lists. |
| `settleCap` | boolean | `false` | At the move cap, the side to move is credited with the most it can win with one capture before the material is counted, so a grab on the last half-move into a recapture does not count (LH17). |



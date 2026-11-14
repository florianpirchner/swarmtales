# Chess

A match of chess games between two seats (two solo residents, or two teams with a rotating captain). The model never
changes the board itself: it writes its move as text and [chess.js](https://github.com/jhlywa/chess.js) checks it,
plays it or refuses it, and ends the game. A move cap, a forfeit clock and resignation keep every game finite, and
every move is scored for the human against a cheap material baseline that the seats never see.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-chess` |
| Id | `chess` |
| Summary | A match of chess games between two solo seats; chess.js checks every move and ends the games. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextGame` |
| Stories | [chess](../../stories/chess/README.md) |

<!-- /generated:glance -->

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

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewBoard`

- Suggested for: `resident`

No parameters.

What the caller reads ([chess/tools/viewBoard](prompts/chess/tools/viewBoard.md)):

> Look at the chess board: the position (White at the bottom), whose move it is, the moves of the game so far, the material, and the game's number in the match.

### `playMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `move` | string | yes | The move: SAN (Nf3, exd5, O-O, e8=Q) or from and to squares (g1f3, e7e8q). |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([chess/tools/playMove](prompts/chess/tools/playMove.md)):

> Play your move in the chess game, only when it is your move. Write it in standard algebraic notation (Nf3, exd5, O-O, e8=Q) or as from and to squares (g1f3, e7e8q). An illegal or unreadable move is refused and you may try again; the board does not change.

### `resign`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([chess/tools/resign](prompts/chess/tools/resign.md)):

> Resign the running game, only when it is your move. The opponent wins the game; the match goes on with the next game.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [chess/tools/viewBoard](prompts/chess/tools/viewBoard.md) | - |
| [chess/tools/playMove](prompts/chess/tools/playMove.md) | - |
| [chess/tools/resign](prompts/chess/tools/resign.md) | - |
| [chess/rules](prompts/chess/rules.md) | `game`, `games`, `colour`, `opponent`, `maxMoves` |
| [chess/your-move](prompts/chess/your-move.md) | `game`, `moveNo`, `colour` |
| [chess/last-move](prompts/chess/last-move.md) | `san` |
| [chess/check](prompts/chess/check.md) | - |
| [chess/legal-moves](prompts/chess/legal-moves.md) | `moves` |
| [chess/threats](prompts/chess/threats.md) | `white`, `black` |
| [chess/how-to-move](prompts/chess/how-to-move.md) | - |
| [chess/still-your-move](prompts/chess/still-your-move.md) | `game`, `moveNo` |
| [chess/forfeit-warning](prompts/chess/forfeit-warning.md) | `left` |
| [chess/advise](prompts/chess/advise.md) | `colour`, `captain` |
| [chess/coach-review](prompts/chess/coach-review.md) | `count`, `total`, `moves` |
| [chess/coach-clean](prompts/chess/coach-clean.md) | `total` |
| [chess/coach-move](prompts/chess/coach-move.md) | `moveNo`, `san`, `loss`, `best` |
| [chess/fresh-context](prompts/chess/fresh-context.md) | - |
| [chess/last-note](prompts/chess/last-note.md) | `moveNo`, `san`, `text` |
| [chess/cap-settled](prompts/chess/cap-settled.md) | - |

<!-- /generated:prompts -->

## Example

From [`stories/chess/story.ts`](../../stories/chess/story.ts), where the variant name's suffixes switch the options:

```ts
chess.with({ games, maxPlies, showLegalMoves, showThreats, coach, maxIdleTurns: IDLE_TURNS, maxForfeits: 3, adjudicateMargin: 3,
	alternateColours: true, score: true, teams: sides, wakeTeam: teams, freshContext: fresh, compactBoard: compact, settleCap }),
```

`chess-nobrain-moves-g4-p120` plays four games without a brain, lists the legal moves and caps games at 120
half-moves. The residents are granted `viewBoard`, `playMove` and `resign`; `playMove` and `resign` start locked and
open only for the seat on move.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH13** a refused move used to answer with every legal move, a free legal list. Fixed: the refusal names only the
  moves of the piece written.
- **LH16** seats ahead in material play quiet moves to reach the cap and its material verdict. Open.
- **LH17** a free grab on the last half-move before the cap. Open; `settleCap` is the counter, on demand.
- **P110** Haiku misses mates in one. Open.
- **P111** the one-ply baseline is noisy at a loss of 1; only blunders read right. Engine reference built.
- **P113, P117, P321, P322** information on the board is the lever: the legal list plus loose pieces gave the best
  Haiku play (ACPL 92 against 138), and without the legal list most blunders go unpunished. Done (the
  `-moves-threats` arm).
- **P115, P320** the strategy brain has no effect on move quality over five seeds. Answered for Haiku.
- **P116** teams cost 2.3 times a solo run and are not better at equal information. Answered for Haiku.
- **P323, P324** a coach review helps when the seat can act on it; its one-ply numbers are rough. Open.
- **P326, P328** Sonnet and Opus play about twice as well at 10 to 20 times the cost; at cap 80 their games end at
  the cap. Partly answered with cap 160.
- **P329** a seat was woken to answer its own move. Fixed in runtime revision 2 (`endsTurn`).
- **P340-P344** a fresh context per half-move makes Haiku think twice as long and writes the cache every move;
  thinking low saves money and costs strength. Open.

## Tests

[`test/stories/chess.test.ts`](../../test/stories/chess.test.ts) covers the mechanic through its story: reading
moves as models write them, loose pieces and the baseline's scoring; scripted matches through the host (alternating
colours, refused moves, mate, forfeits, the move cap, `playMove` open only on move, the legal list, threats, the coach's
review); determinism and a snapshot round trip inside a game and inside a retro window; teams with a rotating captain;
the brain's replay check for text moves; the engine reference of `lab/` (also `test/stories/chess-engine.test.ts`); `endsTurn` (runtime revision 2); the fresh
context, the compact board and the settled cap (LH17).

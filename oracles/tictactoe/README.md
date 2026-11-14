# Oracles: tic-tac-toe (`stories/tictactoe-teams`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `tictactoe-teams-s7.json`, `tictactoe-teams-s11.json` | default: two teams of three, 3x3, three games, a team brain | scripted (`tictactoe`) | proposal, votes, agreed move, team chat, retro windows with a brain per game, one brain refused as a replay of moves (`BRAIN_REPLAY`), X win, draw, O win, the move scores of the minimax referee |
| `tictactoe-teams-nobrain-s7.json` | no brain, no retro | scripted | the control arm: the same three games |
| `tictactoe-teams-solo-s7.json` | one resident per side, with a brain | scripted | the solo path: a proposal that needs no vote |
| `tictactoe-teams-4x4-s7.json` | 4x4 board, four in a row | scripted (`tictactoe4x4`) | X win, O win, a full board; a call to a locked tool and one over the step limit (`STEP_LIMIT`) |
| `tictactoe-teams-5x5-nobrain-solo-s1.json`, `...-s3.json` | 5x5, four in a row, one resident per side, no brain | replay of run `tictactoe-teams-02a-015-strong-vs-haiku` (Haiku against Haiku, seeds 1 and 3), exact | three games as two models played them, with illegal cells (`ILLEGAL_CELL`) |
| `tictactoe-teams-s13-probes.json` | default | scripted (`tictactoeProbed`) | the three games of `-s7` with 24 added calls: every tool of the game called by the wrong resident, with a wrong value, twice, before a game and without arguments. Refused: `NOT_CAPTAIN`, `CAPTAIN_CANNOT_VOTE`, `ALREADY_VOTED`, `NO_OPEN_PROPOSAL`, `ALREADY_AGREED`, `NO_CONSENSUS`, `CONSENSUS_MISMATCH`, `ILLEGAL_CELL`, `POST_CAP`, `BRAIN_EMPTY`, `BRAIN_TOO_LONG`, `BRAIN_REPLAY`, `TOOL_LOCKED`, `TOOL_UNKNOWN`, `INVALID_ARGUMENTS`, `STEP_LIMIT` |
| `tictactoe-teams-s13-silent.json` | default | scripted (`silent`): no resident ever calls a tool | the retro windows close by timeout, each move is forfeited to a seeded legal cell after three rounds (`consensus_forfeited`, `move_played` with `forfeit: true`), and after four forfeits in a row the match is invalid (`match_invalid`, `match_ended` with `invalid: true`) |

Source of the calls. The scripted players are those of `test/stories/tictactoe-support.ts`; here they play the
registry stories with the seeded turn order (the tests use roster order). The two replays reproduce their
recordings exactly (`source.fidelity`). The recording names its story `tictactoe-teams-5x5-solo`; the lab started
it without a brain, which the name left out, so the file names the variant that reproduces it.

Details the files show beyond the mechanic pages ([grid-game](../mechanics/grid-game.md),
[consensus](../mechanics/consensus.md), [optimal-referee](../mechanics/optimal-referee.md)); an independent
checker written from the files alone confirmed each on every file:

- **The captain** of a side is `teams[side][n mod size]`, where `n` counts the moves the side has played in the
  whole match, forfeits included; the count is not reset between games.
- **The vote.** The voters are the team without its captain. A proposal wins as soon as the agreeing votes are more
  than half of the voters, and is rejected as soon as the agreeing votes plus the votes still out are at most half.
  `vote_cast.outcome` states it after every vote (`reached`, `rejected`, `pending`).
- **The start.** X starts game 1; with `alternateStart` the starting side alternates by game.
- **`game_ended`** carries the cells in the order played and, for a win, the winning line in ascending cells.
- **`move_scored`** (3x3 only, audience `human`) is written for a move only where the legal cells differ in their
  minimax value. `value_before` is the best value the mover could reach and `value_after` the value of the cell
  played, both from the mover's view (1 win, 0 draw, -1 loss); `class` is `optimal` when they are equal.
- **A forfeited cell** is drawn from the stream `consensus`, `forfeit`, team, minute, forfeits so far
  ([../README.md](../README.md), "Seeded randomness and hashes").

Not covered: a team of three against one resident (`-solo-x`, `-solo-o`), a fixed captain, a brain as a list of
rules, `consensus_deadlocked` (the `refuse` setting of the deadlock rule; no registry story uses it), the codes of
`grid-game` itself (`CELL_TAKEN`, `OUT_OF_RANGE`: the consensus gate refuses the same cell first, as
`ILLEGAL_CELL`). No recorded run of a 3x3 or team variant replays exactly on today's code: the rules and texts
changed after they were played (the turn line of the captain, P410).

Hidden information: none in the game. The brain texts are in `brain_written` (audience `human`).

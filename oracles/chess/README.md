# Oracles: chess (`stories/chess`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `chess-g4-p80-s41.json` | two seats, four games, at most 80 plies a game, a private brain | replay of run `chess-02a-045-default-g4-s41-r2`, exact | game 1 of 4 (cut): 74 plies, two illegal moves, a resignation |
| `chess-compact-g4-p80-s41.json` | the same with the compact board view | replay of run `chess-02a-047-compact-g4-s41-r2`, exact | game 1 of 4 (cut), one illegal move |
| `chess-fresh-compact-g4-p80-s47.json` | compact view, a fresh context per move | replay of run `chess-02a-054-fresh-compact-low-g4-s47-r2`, exact | game 1 of 4 (cut), three illegal moves, a call to a locked tool |
| `chess-s13.json` | the registry default: two seats, two games, a private brain | scripted (`chessMates`) | the whole match: a mate in every game (f3, e5, g4, Qh4), `game_ended`, the retro windows with a brain, `match_ended`; four refused calls (`ILLEGAL_MOVE` for an illegal and an unreadable move, `INVALID_ARGUMENTS`, `TOOL_LOCKED` for a second move in a row) |
| `chess-s13-silent.json` | the registry default | scripted (`silent`): no resident ever calls a tool | the move timer: moves forfeited to a seeded legal move until the match is called off |
| `chess-moves-s13.json` | `chess-moves`: every position shown lists the legal moves | scripted (`chessMates`) | the mate of `chess-s13.json` in both games with the legal-move list in every position; the same four refused calls |
| `chess-moves-coach-s13.json` | `chess-moves-coach`: the legal-move list and the coach | scripted (`chessBlunders`) | game 1: 1. e4 e5 2. Qh5 g6 3. Qxe5+ Qe7 4. Qxh8 and Black resigns (`resign`, `game_ended` with `resignation`); `coach_review` for both sides (one names the lost pawn and the better move, one finds nothing) and the review as a line of the retro; game 2 is the mate on h4 |
| `chess-nobrain-s13.json` | `chess-nobrain`: the control arm, no brain and no retro | scripted (`chessMates`) | the mate in both games without a retro window; `readBrain` is refused with `TOOL_NOT_GRANTED` |
| `chess-teams-s13.json` | `chess-teams`: two teams of two (A: A01, A02; B: A03, A04), a team chat, a team brain | scripted (`chessTeams`) | the captaincy rotating move by move (`move_played.by`), the advisor's wake with the position (`wakeTeam`) and its `team_post`, the team retro (the retro captain writes, the other posts), a captain's turn that ends without a move and the reminder with the forfeit warning after it; game 1 is the mate on f7 in seven plies, game 2 the mate on h4; refused: a move by the advisor (`TOOL_LOCKED`), a third post in one half-move (`POST_CAP`), a post without a text (`INVALID_ARGUMENTS`); `readTeam` once |
| `chess-p12-s13.json` | `chess-p12`: the registry default with a cap of 12 plies | scripted (`chessCap`) | both games end at the cap (`game_ended` with `move_cap`): game 1 ends with 6... Qxd1+, a queen the king takes back at once, and is scored 0-1 on the material on the board; game 2 ends with White a knight ahead and nothing to take, 1-0; match 0 : 2 |
| `chess-settle-p12-s13.json` | `chess-settle-p12`: the same with `settleCap` (LH17) | scripted (`chessCap`) | the same 24 moves; the rules name the settled cap; game 1 is a draw, because the open capture on d1 is credited to White, game 2 stays 1-0; match 0.5 : 1.5 |
| `chess-threats-s13.json` | `chess-threats`: every position shown lists each side's loose pieces | scripted (`chessBlunders`) | the games of `chess-moves-coach-s13.json` without the coach; the list of loose pieces with entries (the pawn on e5, the rook on h8, the queen on e5) and empty |

Source of the calls: recorded live runs at runtime revision 2. Today's code reproduces each recording word for
word up to the cut (`source.fidelity`; `turnsLeft` counts the turns of games 2 to 4).

Every accepted move is in `move_played` with the position after it (`fen`); `game_ended` repeats the move list.
`move_scored` (audience `human`) is the old platform's own one-ply material score, not an engine verdict; a port
that drops it says so in its mapping. `move_refused` counts illegal moves.

The seven files from `chess-moves-s13.json` on were recorded for milestone M4 of the rewrite (issue M4-17, decision
A39) on the old platform at runtime revision 2, with catalogue entries and three scripted players that are not on
`legacy`: they are the commits of the branch `oracle/m4`, kept here as `../m4-catalog.patch`. To record
them again: apply the patch to a checkout of `legacy` and run
`tsx --conditions=development scripts/export-oracles.ts chess` there.

Not covered: a draw by repetition, stalemate or the fifty-move rule, a draw at the cap with level material on the
board, a forfeit in a team, the coach in a team. `NOT_CAPTAIN` and `NOT_YOUR_MOVE` cannot occur in a file: the old
platform locks `playMove` and `resign` for everyone but the captain of the move, so the call is refused with
`TOOL_LOCKED` at the stage `lock` (`chess-teams-s13.json`, `chess-s13.json`). In the team file not every half-move
has a post: the advisor is woken once per half-move, and where the seeded order of a pass puts the captain first,
the move is played before the advice. No recorded run at revision 1 replays exactly (a move ends the turn since
revision 2).

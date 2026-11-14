# Oracles: chess (`stories/chess`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `chess-g4-p80-s41.json` | two seats, four games, at most 80 plies a game, a private brain | replay of run `chess-02a-045-default-g4-s41-r2`, exact | game 1 of 4 (cut): 74 plies, two illegal moves, a resignation |
| `chess-compact-g4-p80-s41.json` | the same with the compact board view | replay of run `chess-02a-047-compact-g4-s41-r2`, exact | game 1 of 4 (cut), one illegal move |
| `chess-fresh-compact-g4-p80-s47.json` | compact view, a fresh context per move | replay of run `chess-02a-054-fresh-compact-low-g4-s47-r2`, exact | game 1 of 4 (cut), three illegal moves, a call to a locked tool |
| `chess-s13.json` | the registry default: two seats, two games, a private brain | scripted (`chessMates`) | the whole match: a mate in every game (f3, e5, g4, Qh4), `game_ended`, the retro windows with a brain, `match_ended`; four refused calls (`ILLEGAL_MOVE` for an illegal and an unreadable move, `INVALID_ARGUMENTS`, `TOOL_LOCKED` for a second move in a row) |
| `chess-s13-silent.json` | the registry default | scripted (`silent`): no resident ever calls a tool | the move timer: moves forfeited to a seeded legal move until the match is called off |

Source of the calls: recorded live runs at runtime revision 2. Today's code reproduces each recording word for
word up to the cut (`source.fidelity`; `turnsLeft` counts the turns of games 2 to 4).

Every accepted move is in `move_played` with the position after it (`fen`); `game_ended` repeats the move list.
`move_scored` (audience `human`) is the old platform's own one-ply material score, not an engine verdict; a port
that drops it says so in its mapping. `move_refused` counts illegal moves.

Not covered: the variants with legal-move lists, threats or a coach (`coach_review`), the team variant
(`team_post`, `NOT_CAPTAIN`), a draw by repetition or by the ply limit, a resignation. No recorded run at revision 1
replays exactly (a move ends the turn since revision 2).

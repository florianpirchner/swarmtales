# Oracles: chess (`stories/chess`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `chess-g4-p80-s41.json` | two seats, four games, at most 80 plies a game, a private brain | replay of run `chess-02a-045-default-g4-s41-r2`, exact | game 1 of 4 (cut): 74 plies, two illegal moves, a resignation |
| `chess-compact-g4-p80-s41.json` | the same with the compact board view | replay of run `chess-02a-047-compact-g4-s41-r2`, exact | game 1 of 4 (cut), one illegal move |
| `chess-fresh-compact-g4-p80-s47.json` | compact view, a fresh context per move | replay of run `chess-02a-054-fresh-compact-low-g4-s47-r2`, exact | game 1 of 4 (cut), three illegal moves, a call to a locked tool |

Source of the calls: recorded live runs at runtime revision 2. Today's code reproduces each recording word for
word up to the cut (`source.fidelity`; `turnsLeft` counts the turns of games 2 to 4).

Every accepted move is in `move_played` with the position after it (`fen`); `game_ended` repeats the move list.
`move_scored` (audience `human`) is the old platform's own one-ply material score, not an engine verdict; a port
that drops it says so in its mapping. `move_refused` counts illegal moves.

Not covered: the registry default `chess` (one game; no recorded run of it replays exactly), the variants with
legal-move lists, threats or a coach, the team variant, a draw by repetition or by the ply limit, a forfeit by the
move timer. No recorded run at revision 1 replays exactly (a move ends the turn since revision 2).

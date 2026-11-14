# Oracles: tic-tac-toe (`stories/tictactoe-teams`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `tictactoe-teams-s7.json`, `tictactoe-teams-s11.json` | default: two teams of three, 3x3, three games, a team brain | scripted (`tictactoe`) | proposal, votes, agreed move, team chat, retro windows with a brain per game, one brain refused as a replay of moves (`BRAIN_REPLAY`), X win, draw, O win, the move scores of the minimax referee |
| `tictactoe-teams-nobrain-s7.json` | no brain, no retro | scripted | the control arm: the same three games |
| `tictactoe-teams-solo-s7.json` | one resident per side, with a brain | scripted | the solo path: a proposal that needs no vote |
| `tictactoe-teams-4x4-s7.json` | 4x4 board, four in a row | scripted (`tictactoe4x4`) | X win, O win, a full board; a call to a locked tool and one over the step limit (`STEP_LIMIT`) |
| `tictactoe-teams-5x5-nobrain-solo-s1.json`, `...-s3.json` | 5x5, four in a row, one resident per side, no brain | replay of run `tictactoe-teams-02a-015-strong-vs-haiku` (Haiku against Haiku, seeds 1 and 3), exact | three games as two models played them, with illegal cells (`ILLEGAL_CELL`) |

Source of the calls. The scripted players are those of `test/stories/tictactoe-support.ts`; here they play the
registry stories with the seeded turn order (the tests use roster order). The two replays reproduce their
recordings exactly (`source.fidelity`). The recording names its story `tictactoe-teams-5x5-solo`; the lab started
it without a brain, which the name left out, so the file names the variant that reproduces it.

Not covered: forfeits by the move timer (a silent team), an invalid match after four forfeits in a row, a team of
three against one resident (`-solo-x`, `-solo-o`), a fixed captain, a brain as a list of rules. No recorded run of a
3x3 or team variant replays exactly on today's code: the rules and texts changed after they were played (the
turn line of the captain, P410).

Hidden information: none in the game. The brain texts are in `brain_written` (audience `human`).

# Runs of tic-tac-toe

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs` (decision
A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run (A52,
`docs/RERUN-PLAN-M6.md`): the residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 16000 (the game
file's); no Director; pricing `pi-ai@1.4.0`. The spend ledger of M6 is [`../m6-ledger.jsonl`](../m6-ledger.jsonl). The
recorded runs of the old platform are under `stories/tictactoe-teams/runs/` at the tag `v0-final`.

| Run | Path on `data/runs` | Data commit | Code commit | Runtime | Cost (USD) | Result |
|---|---|---|---|---:|---:|---|
| Live baseline of 1.0 (A124; issue M6-24, run 1 of the plan), the default game (three games, 3x3, a brain for both teams), seed 7, purpose `exploratory` | `tictactoe/baseline/tictactoe-001` | `2c42bcba` on `data/runs` | `155d497e`, clean tree (`kernel.dirty: false`) | 8 | 0.0785 of the cap 0.30 | the match was over after 24 ticks (`grid.match`), exit 0; three draws (`grid.tally` X 0, O 0, draw 3); 15 of 15 moves scored by `optimal-referee` optimal; no forfeit |

The folder verifies with `swt log verify` (3488 lines), replays equal with `swt replay --game` (3488 lines), is clean
under `swt scan` (keys of 2 providers held) and holds a `REPORT.md` written with `--game`; its manifest matches the
plan's table of the models. The tally and the referee's scores are read from the log and the CLI's last line, since the
report's facts table holds neither (P497). Loopholes: none. Problems: P497 new; P77 and P85 seen again.

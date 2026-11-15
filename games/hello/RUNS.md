# Runs of the Hello Game

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; each has a `README.md` with its loopholes, problems and solutions. Model of every run: `anthropic/haiku`,
resolved to `claude-haiku-5-5`, thinking medium, output cap 4000. The spend ledger of M4 is
[`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of the M2 gate, seed 1 | `smoke/hello-game-001` | `0f726704` | `b7de6505` | 3 | 1 run | none: tick limit (12), 8 of 9 moves, tally 0, 0, 0 (P445) | 0.0015 |
| Cap run of M4 (issue M4-60, spec 7.3), seed 1, `--budget 0.002` | `hello/smoke/hello-game-001` | not pushed yet | `7ea5ea10` | 4 | 1 run | none: tick limit (12), as at M2; the cap was **not** reached (P470) | 0.0018 |
| Cap run of M4, again at `--budget 0.001` | `hello/smoke/hello-game-002` | not pushed yet | `7ea5ea10` | 4 | 1 run | none: ended at `models.budget` at tick 10, 0.00133 against the cap 0.001 (P472); replay differs at the limit line (P471) | 0.0013 |

Both M4 folders verify with `swt log verify` and are clean under `swt scan`; `hello-game-001` replays equal with
`swt replay`, `hello-game-002` does not (`SWT-C031` at line 155, the `limit_reached` of the cost cap: the replay has
no cost meter, P471). Each holds a `REPORT.md` written with `--game`. Loopholes: none. The logs of both runs were
read whole.

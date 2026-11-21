# Runs of the Hello Game

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; each has a `README.md` with its loopholes, problems and solutions. Model of every run: `anthropic/haiku`,
resolved to `claude-haiku-5-5`, thinking medium, output cap 4000. The spend ledger of M4 is
[`../m4-ledger.jsonl`](../m4-ledger.jsonl), that of M6 [`../m6-ledger.jsonl`](../m6-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of the M2 gate, seed 1 | `smoke/hello-game-001` | `0f726704` | `b7de6505` | 3 | 1 run | none: tick limit (12), 8 of 9 moves, tally 0, 0, 0 (P445) | 0.0015 |
| Cap run of M4 (issue M4-60, spec 7.3), seed 1, `--budget 0.002` | `hello/smoke/hello-game-001` | `024119a1` | `7ea5ea10` | 4 | 1 run | none: tick limit (12), as at M2; the cap was **not** reached (P470) | 0.0018 |
| Cap run of M4, again at `--budget 0.001` | `hello/smoke/hello-game-002` | `024119a1` | `7ea5ea10` | 4 | 1 run | none: ended at `models.budget` at tick 10, 0.00133 against the cap 0.001 (P472); replay differs at the limit line (P471) | 0.0013 |
| Release smoke of M6 (M6-25, run 3 of `docs/RERUN-PLAN-M6.md`), seed 1, `--budget 0.03`, from the packed install | `hello/release/hello-game-001` | `f02a7a75` | `5e49fb93` | 8 | 1 run | none: tick limit (12), the same 8 of 9 moves as at M2 and M4, tally 0, 0, 0 (P445); `kernel.dirty` absent (no git checkout, P502) | 0.0019 |
| `swt doctor --online --provider anthropic` of M6 (M6-25, run 2), from the packed install | `hello/release/doctor-online.json` | `f02a7a75` | `5e49fb93` | 8 | 1 request | none: nine `ok`, the estimate (0.0000069) before the request | 0.0000021 |

Both M4 folders verify with `swt log verify` and are clean under `swt scan`; `hello-game-001` replays equal with
`swt replay`, `hello-game-002` does not (`SWT-C031` at line 155, the `limit_reached` of the cost cap: the replay has
no cost meter, P471). Each holds a `REPORT.md` written with `--game`. Loopholes: none. The logs of both runs were
read whole.

The two runs of M6 played in a project outside the work tree that installed the packed release candidate (the form of
the packed-install gate, M6-08: `swarmtales` and `@swarmtales/mechanic-grid` from their tarballs, a lockfile written
from the workspace's, an offline frozen install), through the installed `swt`, so the built `dist` ran. The
manifest of the game run names no `kernel.commit` and no `kernel.dirty`: the installed CLI is in no git checkout (P502). The folder
verifies, replays equal and is clean under `swt scan`, all with the installed `swt`, and holds a `REPORT.md` written
with `--game`; the log was read whole. Loopholes: none. Problems: P445 seen again; P502 and P503 new.

# Runs of liar's dice

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's). The spend
ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-60, spec 7.3), the default game, seed 53: stopped | `liars-dice/smoke/liars-dice-001` | `024119a1` | `7ea5ea10` | 4 | 0 runs | none: stopped from outside after ten minutes in game 3 (the operator's tool limit, P473); no signed end | 0.0810 |
| Live smoke of M4, the same command again | `liars-dice/smoke/liars-dice-002` | `024119a1` | `7ea5ea10` | 4 | 1 run | scores A01 7, A02 7, A03 3, A04 1 (`liars-dice.match`); baseline agreement 0.892, bluff share 0.034, callers lost 34 of 45 calls | 0.1088 |

`liars-dice-002` verifies with `swt log verify`, replays equal with `swt replay` (3321 lines), is clean under `swt
scan` and holds a `REPORT.md` written with `--game`. `liars-dice-001` has no end (`SWT-L002`), is clean under the
scan and is kept because nothing of a live run is deleted unrecorded; its cost line in the ledger is written by hand
from the log (P462). Loopholes: none. Problems: P474 (empty wakes after a brain write), P446 seen again (three
rewrites refused, all written again in time).

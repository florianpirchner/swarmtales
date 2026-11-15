# Runs of Convoy

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's). The spend
ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-61, spec 7.3), the default game, seed 53 | `convoy/smoke/convoy-001` | not pushed yet | `f0de5e95` | 4 | 1 run | scores A01 2, A02 3, A03 2, A04 1, A05 2, A06 2 (`convoy.match`); the loyal seats won 3 of 3; damage per chance 0.42, loyal accusation hits 0.92 | 0.1973 |

The code commit `f0de5e95` holds the code of `7ea5ea10` (it adds only the run rows of M4-60). The folder verifies with
`swt log verify`, replays equal with `swt replay` (5131 lines), is clean under `swt scan` and holds a `REPORT.md`
written with `--game`. Loopholes: none. Problems: P477 (116 of 518 turns are wakes on news with nothing to do), P446
seen again with a lost brain (A01 after game 1).

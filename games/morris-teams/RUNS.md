# Runs of nine men's morris teams

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's). The spend
ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-61, spec 7.3): one resident against the search, `--set teamSize=1 --set engineDepth=3`, seed 13 | `morris-teams/smoke/morris-teams-001` | not pushed yet | `f0de5e95` | 4 | 1 run | tally X 1, O 1, draw 1 (`morris.match`): lost by blockade, drawn by repetition, won on pieces; 1 blunder in 141 scored turns | 0.0969 |

The code commit `f0de5e95` holds the code of `7ea5ea10` (it adds only the run rows of M4-60). The folder verifies with
`swt log verify`, replays equal with `swt replay` (2516 lines), is clean under `swt scan` and holds a `REPORT.md`
written with `--game`. Loopholes: none. Problems: P474 and P446 seen again (two rewrites refused, both written in
time).

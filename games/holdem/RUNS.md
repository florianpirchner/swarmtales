# Runs of hold'em

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's). The spend
ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-61, spec 7.3), the default game, seed 41 | `holdem/smoke/holdem-001` | not pushed yet | `7ea5ea10` | 4 | 1 run | scores A01 -10, A02 -16, A03 -27, A04 53 (`holdem.match`); EV loss 0.228 per decision, calls without the odds 15.6 %, VPIP 0.66 (old unaided Haiku: 0.26, 17.4 %, 0.73) | 0.1159 |

The folder verifies with `swt log verify`, replays equal with `swt replay` (6568 lines), is clean under `swt scan`
and holds a `REPORT.md` written with `--game`. Loopholes: none; no brain keeps a card of the duplicate deals.
Problems: P474 and P446 seen again (five rewrites refused, all written in time), LH19 seen again.

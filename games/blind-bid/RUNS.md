# Runs of Blind Bid

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none). The
spend ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-60, spec 7.3), the default game, seed 31 | `blind-bid/smoke/blind-bid-001` | `024119a1` | `7ea5ea10` | 4 | 1 run | scores A01 68, A02 38, A03 6, A04 52 (`sealed-auction.match`); shading 0.67, truthfulness 0.98, 2 cursed lots, 44.5 % of the purse unspent | 0.0216 |

The folder verifies with `swt log verify`, replays equal with `swt replay` (1099 lines), is clean under `swt scan`
and holds a `REPORT.md` written with `--game`. Loopholes: none. Problems: P474 seen again (11 empty wakes after a
brain write), P446 seen again (one rewrite refused, written again in time).

# Runs of Ember Tricks

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none). The
spend ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-60, spec 7.3), `--set games=1`, seed 23 | `ember-tricks/smoke/ember-tricks-001` | not pushed yet | `7ea5ea10` | 4 | 1 run | totals A01 0, A02 -5, A03 -5, A04 25 (`trick-play.match`); bids hit 0.406, mean bid 0.72 tricks; one veto | 0.0540 |

The folder verifies with `swt log verify`, replays equal with `swt replay` (2858 lines), is clean under `swt scan`
and holds a `REPORT.md` written with `--game`. Loopholes: none. Problems: P475 (130 of 323 requests are answer
turns with a `viewTable` that says "Not your turn"), P476 (with `games: 1` no brain is ever written).

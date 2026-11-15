# Runs of Salt Market

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none). The
spend ledger of M4 is [`../m4-ledger.jsonl`](../m4-ledger.jsonl).

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M4 (issue M4-61, spec 7.3), the default game, seed 41 | `salt-market/smoke/salt-market-001` | `024119a1` | `f0de5e95` | 4 | 1 run | scores A01 160, A02 158, A03 163, A04 128 (`salt-market.match`); 3 contracts of 16, 609 table points, gain over idle 0.07, efficiency -0.36, no credit | 0.1831 |
| Live check of `markOwnOffers` (issue M4-70, A46, P478), the default game with `--set markOwnOffers=true`, seed 41 | `salt-market/check-m4-70/salt-market-001` | `356c1236` | `864ab0e8` | 4 | 1 run | scores A01 147, A02 173, A03 143, A04 160 (`salt-market.match`); 4 contracts of 16, 623 table points, gain over idle 0.10, efficiency -0.31, 1 credit trade; own-offer accepts 1 (smoke: 4) | 0.1746 |

The code commit `f0de5e95` holds the code of `7ea5ea10` (it adds only the run rows of M4-60). The folder verifies with
`swt log verify`, replays equal with `swt replay` (3317 lines), is clean under `swt scan` and holds a `REPORT.md`
written with `--game`. Loopholes: none. Problems: P478 (a seat accepts its own offer, four times), P446 seen again
with a lost brain (A03 after game 3), P94 seen once (a turn ended at the 4000-token cap).

The code commit `864ab0e8` is the M4-70 branch on `b58aac55`, before M4-68 and M4-69 (runtime revision 4); the branch
was then rebased, with the same Salt Market code. The check run of M4-70 verifies, replays equal (3232 lines), is clean under `swt scan` and holds a `REPORT.md`
written with `--game`. The mark is read (50 turn inputs carry it); one seat still accepts its own offer once (#1924),
because it took `accept` for the proposer's confirmation (its note, #1830). Loopholes: none.

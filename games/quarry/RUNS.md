# Runs of Quarry

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; the write-up of the M2 gate is [`docs/M2-GATE.md`](../../docs/M2-GATE.md), that of the two cure series of
decision A29 [`docs/M2-CURES.md`](../../docs/M2-CURES.md). Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Pilot, control at seed 31 | `smoke/quarry-001` | `0f726704` | `b7de6505` | 3 | 1 run | 1071 table points | 0.0337 |
| `quarry-noise-floor`: control at seed 31 | `quarry/quarry-noise-floor/` | `5b9b5b8e` | `b7de6505` | 3 | 5 runs | mean 1088 (SE 35.8); old platform 1081, difference +6.8 (SE 44.2): within | 0.1715 |
| `quarry-open-quarries`: open against control | `quarry/quarry-open-quarries/` | `c787daaf` | `b7de6505` | 3 | 12 pairs, none excluded | +84.5 table points (SE 22.0, 95 % interval 36 to 133): sign kept | 0.9099 |
| `quarry-open-quarries-frozen`: open quarries frozen per pick against control (LH18, decision A29) | `quarry/quarry-open-quarries-frozen/` | `0069c997` | `77d0307e` | 3 | 6 pairs, none excluded; two more folders of a stopped call hold no finished run | +75.5 table points (SE 27.3, 95 % interval 5.3 to 145.7), exploratory, no pass rule; the gate on the same six seeds +85.7 (SE 21.7) | 0.4594 |
| Legacy noise floor (old platform) | `legacy/quarry/` | `5bfb55ff` | `48ddf0af` on `m0/noise-floor` | 2 | 15 runs | control at seed 31: mean 1081 (SD 58, n 5) | not in the M2 ledger |

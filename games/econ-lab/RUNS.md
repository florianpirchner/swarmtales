# Runs of Econ Lab

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; the write-up of the M2 gate is [`docs/M2-GATE.md`](../../docs/M2-GATE.md). Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Pilot, `nobrain` at label 41 | `smoke/econ-lab-001` | `0f726704` | `b7de6505` | 3 | 1 run | dilemma cooperation 1.00 | 0.0125 |
| `econ-lab-noise-floor`: `nobrain` at label 41 | `econ-lab/econ-lab-noise-floor/` | `5b9b5b8e` | `b7de6505` | 3 | 5 runs | 3 of 5 tables locked (share 0.60, Wilson 0.23 to 0.88); old platform 4 of 5: within | 0.0628 |
| `econ-lab-brain`: brain against `nobrain` | `econ-lab/econ-lab-brain/` | `c787daaf` | `b7de6505` | 3 | 12 runs per arm, none excluded | -0.771 dilemma cooperation (SE 0.084, 95 % interval -0.954 to -0.588): sign kept | 0.4101 |
| Legacy noise floor (old platform) | `legacy/econ-lab/` | `5bfb55ff` | `48ddf0af` on `m0/noise-floor` | 2 | 10 runs | `nobrain` at label 41: 4 of 5 tables locked, mean 0.87 | not in the M2 ledger |

# Runs of econ-lab

One folder per run: `econ-lab-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [econ-lab-04a-001-smoke](econ-lab-04a-001-smoke/) | 2026-11-06 | default: split offer, shared fund, A-or-B, 6 rounds each, brain on, unknown horizon | Haiku | every split 5/5 and accepted; the fund settles at exactly half (cooperation 0.55); the A-or-B game collapses to B after one A in round 1 (cooperation 0.04); no missed decision, no refusal; brains learn "free-riding pays" after the fund (P89-P92) | 0.02 USD |
| [econ-lab-04a-002-rate-limited](econ-lab-04a-002-rate-limited/) | 2026-11-11 | brain against no brain, seeds 41-48, first attempt | Haiku | 54 turns lost to 429 errors, 34 missed decisions; same picture as 003; kept as data (P431) | 0.292 USD |
| [econ-lab-04a-003-brain-vs-nobrain](econ-lab-04a-003-brain-vs-nobrain/) | 2026-11-11 | `econ-lab` against `econ-lab-nobrain`, 8 paired seeds (41-48) | Haiku | the brain carries "free-riding pays" from the shared fund into the A-or-B game: cooperation 0.11 vs 0.51 (paired -0.40, SE 0.13), round 1 0.38 vs 0.81; table -37 points per match (SE 11); split offers 0.37-0.38 in both, no rejection (P433) | 0.276 USD |
| [econ-lab-04a-004-sonnet-opus](econ-lab-04a-004-sonnet-opus/) | 2026-11-11 | whole Sonnet tables and whole Opus tables, brain against no brain, seeds 41-44 | Sonnet, Opus | Opus plays the social optimum on every table with or without a brain (fund and A-or-B 1.00, 628 points); Sonnet like Haiku: the brain lowers A-or-B cooperation 0.84 to 0.36 and the table by 36 points (P433, P436) | 5.016 USD |

# Runs of holdem

One folder per run: `holdem-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [holdem-04a-001-smoke](holdem-04a-001-smoke/) | 2026-11-06 | default: 4 seats, 4 games x 8 duplicate hands, brain on | Haiku | 32 hands, 428 decisions, none missed; A01 +39, A04 +1, A03 -10, A02 -30; passive (calls 2:1 over bets and raises, no pure bluff); brains learn opponent notes; board-pair misreading and seat confusion fixed after the run (P130-P135) | 0.30 USD |
| [holdem-04a-002-brain-vs-nobrain](holdem-04a-002-brain-vs-nobrain/) | 2026-11-06 | 8 runs: `holdem` x3, `holdem-nobrain` x3 (seeds 41-43), `holdem-mixed` x2 (A01, A03 with brain) | Haiku | the brain makes seats tighter (VPIP 0.74 to 0.55 over four games; no brain stays near 0.7) and more aggressive, with fewer calls and showdowns in every run; mixed tables: brain seats +5.6 per seat and game (SE about 9, not significant); out-of-turn acts traced to the record line (P131, P138, P139) | 2.47 USD |
| [holdem-04a-003-input-fix](holdem-04a-003-input-fix/) | 2026-11-06 | `holdem`, seed 44, with the P131 input fix | Haiku | out-of-turn `act` drops from about 48 per run to 7, cost 0.20 USD; VPIP 0.69 to 0.56 over the games | 0.20 USD |
| [holdem-04a-004-mixed-tables](holdem-04a-004-mixed-tables/) | 2026-11-06 | 8 x `holdem-mixed` (seeds 51-58) with the P134 and P138 fixes | Haiku | brain seats +0.8 per seat and game (+1.8 over all ten mixed tables, SE 2.4): no measurable points edge; the style effect repeats (VPIP 0.75 to 0.52, no brain stays near 0.73); the range baseline now ranks the brain seats better (EV loss 0.25 against 0.29); a first attempt stopped halfway on a container restart (0.95 USD) | 2.68 USD |
| [holdem-02a-005-hu-mixed](holdem-02a-005-hu-mixed/) | 2026-11-07 | 4 x `holdem-hu-mixed` (seeds 61-64): heads-up, A01 with a brain, A02 without | Haiku | A01 +5 over four matches (+0.6 per game, SE 10): no edge heads-up either; the brain seat folds twice as often; duplicate pairs keep match totals within 8 (P290, P291) | 0.21 USD |

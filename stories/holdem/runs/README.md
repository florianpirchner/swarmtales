# Runs of holdem

One folder per run: `holdem-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [holdem-04a-001-smoke](holdem-04a-001-smoke/) | 2026-11-06 | default: 4 seats, 4 games x 8 duplicate hands, brain on | Haiku | 32 hands, 428 decisions, none missed; A01 +39, A04 +1, A03 -10, A02 -30; passive (calls 2:1 over bets and raises, no pure bluff); brains learn opponent notes; board-pair misreading and seat confusion fixed after the run (P130-P135) | 0.30 USD |
| [holdem-04a-002-brain-vs-nobrain](holdem-04a-002-brain-vs-nobrain/) | 2026-11-06 | 8 runs: `holdem` x3, `holdem-nobrain` x3 (seeds 41-43), `holdem-mixed` x2 (A01, A03 with brain) | Haiku | the brain makes seats tighter (VPIP 0.74 to 0.55 over four games; no brain stays near 0.7) and more aggressive, with fewer calls and showdowns in every run; mixed tables: brain seats +5.6 per seat and game (SE about 9, not significant); out-of-turn acts traced to the record line (P131, P136, P137) | 2.47 USD |
| [holdem-04a-003-input-fix](holdem-04a-003-input-fix/) | 2026-11-06 | `holdem`, seed 44, with the P131 input fix | Haiku | out-of-turn `act` drops from about 48 per run to 7, cost 0.20 USD; VPIP 0.69 to 0.56 over the games | 0.20 USD |

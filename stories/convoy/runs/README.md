# Runs of convoy

One folder per run: `convoy-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

Runtime: the runtime revision a run played on ([docs/RUNTIME-REVISIONS.md](../../../docs/RUNTIME-REVISIONS.md)); runs of different revisions are not compared without saying so.

| Run | Date | Runtime | Variant | Residents | Result | Cost |
|---|---| --- |---|---|---|---:|
| [convoy-06a-001-smoke](convoy-06a-001-smoke/) | 2026-11-06 | r1 | `convoy-g2`: 6 seats, 2 games, brain on | Haiku | the convoy won both games (1 and 2 damaged stages of 8); game 1 saboteurs damaged one crew together and were caught, game 2 deflected suspicion onto a loyal seat; 95 of 96 votes yes; no role refused, no leak (P150-P155) | 0.15 USD |
| [convoy-06a-002-brain-vs-nobrain](convoy-06a-002-brain-vs-nobrain/) | 2026-11-06 | r1 | `convoy` and `convoy-nobrain`, seeds 101-105, 3 games each | Haiku | 30 games, the saboteurs won 1 (brain) and 0; with a brain saboteurs damage on 52 % of their chances against 38 % (2.0 against 1.4 damaged stages a game, more on 4 of 5 paired seeds, already in game 1); loyal detection unchanged (0.79 hits in both arms, tracker 0.86 / 0.83); 21 crews voted down (P151 fix holds) (P270-P272, P274) | 1.87 USD |
| [convoy-06a-003-damage3](convoy-06a-003-damage3/) | 2026-11-06 | r1 | `convoy-d3`: three damaged stages lose, seeds 101-102 | Haiku | the saboteurs won 2 of 6 games (bots predicted 34 %), both at stage 7; loyal hits 0.90 (P273) | 0.36 USD |
| [convoy-06a-004-d3-brain-vs-nobrain](convoy-06a-004-d3-brain-vs-nobrain/) | 2026-11-06 | r1 | `convoy` and `convoy-nobrain` at the new default of three damaged stages, seeds 101-105, 3 games each | Haiku | the saboteurs won 5 (brain) and 3 of 15; both arms damage on 60 % of their chances, but without a brain the saboteurs double up on one crew (game 1: 5 of 5 damaged stages with two cards, brain 1 of 12); the brain edge is gone by game 3; detection 0.88 / 0.93 (P275) | 1.77 USD |

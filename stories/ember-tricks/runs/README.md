# Runs of ember-tricks

One folder per run: `ember-tricks-<NN>a-<run>-<short-name>/`, with a `README.md` and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [ember-tricks-04a-001-smoke](ember-tricks-04a-001-smoke/) | 2026-11-06 | `ember-tricks-g2-r4`: 2 games of rounds 1-4, notes on, seed 23 | Haiku | A01 wins game 1 (40), A02 game 2 (46); 22 of 32 bids hit, 21 bids were 0; 2 vetoes, 0 forfeits; four sets of notes; the trump namer used trump against another zero bidder (LH12); 55 % of calls were redundant `viewTable` (P95) | 0.055 USD |
| [ember-tricks-04a-002-long-matrix](ember-tricks-04a-002-long-matrix/) | 2026-11-06 | full game (8 rounds), 4 games, miss costs 5 + error squared, notes on and off x seeds 31-33 | Haiku | 43 % hits, 59 % zero bids, mean bid 0.44 against 1.12 expected (P136); no difference with or without notes (P137); `viewTable` still half the calls (P95) | 2.03 USD |
| [ember-tricks-04a-003-levers](ember-tricks-04a-003-levers/) | 2026-11-06 | 4 games x 8 rounds, notes on, free `viewTable`; control, bid sum lever, calibration lever x seeds 31-33 | Haiku | calibration line: mean bid 0.45 → 0.64, zero bids 58 % → 42 %, points per seat-round doubled, hits unchanged (P136, P165); bid sum: no effect; `viewTable` still half the calls (P95 cause found) | 2.54 USD |
| [ember-tricks-04a-004-quiet-look](ember-tricks-04a-004-quiet-look/) | 2026-11-06 | `ember-tricks-g1`, seed 31, after the quiet-look kernel fix | Haiku | requests in game 1 449 → 327, `viewTable` 215 → 137 (P95) | 0.053 USD |
| [ember-tricks-04a-005-reference](ember-tricks-04a-005-reference/) | 2026-11-06 | 4 games x 8 rounds, notes on, quiet look; calibration line (baseline), plus the Monte Carlo worth in the retro (mcretro) or at the bid (mcbid) x seeds 31-33 | Haiku | mcbid: hits 50 % against 44 %, points per seat-round 2.36 against 0.73, bid - MC -0.36 against -0.54; mcretro in between (1.39); the reference itself would hit 48 % (P165 answered, P220) | 2.15 USD |

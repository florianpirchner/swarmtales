# ember-tricks-04a-005-reference

Nine long Haiku matches of `ember-tricks` on 2026-11-06, run in parallel, after the quiet-look fix (run 004): the full
game (8 rounds, 1 to 8 cards), 4 games per match, notes on in every arm, seeds 31, 32, 33. The question (P165): does the
Monte Carlo worth of the seat's own hands help beyond the plain calibration line of run 003? Every arm keeps that line.

- **calib** (`ember-tricks-calib-g4`, the baseline): the retro line "you bid 6 tricks in all and took 10 ...".
- **mcretro** (`ember-tricks-mcretro-g4`): the same line plus the reference, round by round, for example "A simulation of
  random deals and trumps rated your hands at 8.3 tricks in all (1.0 per round), against your 7 bid: r1 bid 1, worth 0.3,
  took 1; r2 bid 0, worth 0.6, took 0; ..." (mcretro-s32, game 1).
- **mcbid** (`ember-tricks-mcbid-g4`): the baseline line, and while bidding "A simulation of random deals and trumps rates
  your hand at about 1.4 tricks from your seat."

The worth comes from `mechanics/trick-play/src/reference.ts` (the offline script's algorithm, now in the mechanic): 200
random deals of the unseen cards and a random trump, a simple play policy, the host's seeded stream (the deal is the same
in every arm of one seed). About 35 minutes wall time per match; all nine ended by the referee after game 4. Each folder
holds `000-run.json`, the signed log (`events.jsonl.gz`, `events.chain.jsonl.gz`, `run.pub`) and `usage.json`; no
transcripts. Calibration from `scripts/ember-calibration/analyze.ts` (its own 400 deals per hand). No reporter run; this
README is the run report.

## Result

| Arm | Seed | Hits | Zero bids | Mean bid | Bid - MC | Points per seat-round | Wins (A01-A04) | Vetoes | Cost |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| calib | 31 | 53/128 (41 %) | 44 % | 0.59 | -0.55 | 0.04 | 0 / 1 / 0 / 2 | 5 | 0.24 USD |
| calib | 32 | 60/128 (47 %) | 45 % | 0.59 | -0.53 | 1.25 | 1 / 1 / 1 / 1 | 11 | 0.25 USD |
| calib | 33 | 56/128 (44 %) | 50 % | 0.56 | -0.55 | 0.89 | 1 / 0 / 2 / 1 | 4 | 0.24 USD |
| mcretro | 31 | 63/128 (49 %) | 44 % | 0.63 | -0.51 | 1.64 | 1 / 1 / 1 / 1 | 3 | 0.24 USD |
| mcretro | 32 | 63/128 (49 %) | 44 % | 0.65 | -0.46 | 1.78 | 0 / 2 / 1 / 1 | 3 | 0.24 USD |
| mcretro | 33 | 57/128 (45 %) | 47 % | 0.57 | -0.54 | 0.73 | 1 / 1 / 1 / 0 | 3 | 0.23 USD |
| mcbid | 31 | 58/128 (45 %) | 38 % | 0.81 | -0.32 | 1.44 | 1 / 0 / 2 / 1 | 3 | 0.23 USD |
| mcbid | 32 | 68/128 (53 %) | 42 % | 0.72 | -0.39 | 2.73 | 2 / 1 / 1 / 0 | 4 | 0.23 USD |
| mcbid | 33 | 67/128 (52 %) | 40 % | 0.74 | -0.37 | 2.92 | 0 / 0 / 2 / 2 | 3 | 0.24 USD |

By arm (384 bids each; the reference expects 1.12 tricks, taken 1.13 in every arm):

| Arm | Hits | Zero bids | Mean bid | Bid - MC | Points per seat-round | Requests |
|---|---:|---:|---:|---:|---:|---:|
| calib | 44 % | 46 % | 0.58 | -0.54 | 0.73 | 4,050 |
| mcretro | 48 % | 45 % | 0.61 | -0.51 | 1.39 | 4,019 |
| mcbid | 50 % | 40 % | 0.76 | -0.36 | 2.36 | 3,996 |

In the mcbid arm 242 of 384 bids (63 %) were exactly the shown worth rounded, 137 (36 %) lower, 5 higher. A seat that
always bid the rounded worth would have hit 185 of 384 (48 %).

**Cost 2.15 USD** for nine matches (36 games, about 0.060 USD per game; 12,065 requests; run 003: 0.071 USD and about
1,800 requests per match before the quiet-look fix). 0 forfeits, 0 rule breaks.

## Digest highlights

- **The worth at the bid helps most.** mcbid bids closest to the reference (bid - MC -0.36 against -0.54), hits 50 %
  against 44 % and scores three times the baseline's points per seat-round (2.36 against 0.73), on all three seeds
  (hits 45-53 % against 41-47 %, points 1.4-2.9 against 0.0-1.3).
- **The models trust the number, but only downward.** Nearly two thirds of the mcbid bids are the shown worth rounded;
  almost every other bid is lower (36 %), almost none higher (1 %). The zero-bid habit survives as a rounding-down habit.
- **The worth in the retro adds little.** mcretro is between the two (hits 48 %, points 1.39), within the seed spread of
  the baseline on bids (0.61 against 0.58). The round-by-round list is read: mcretro-s32 notes after game 3 say "Low hands
  still win tricks late (game 3: bid 1, took 3 and 4), so prefer 1 over 0 when unsure."
- **About 50 % hits is close to the ceiling here.** The reference itself, bid as it stands, would hit 48 %: the deal and
  the trump named after the bids leave that much noise. P165 is answered: the hits do not rise much because calibrated
  bids hit about half the time in this game; better calibration pays through higher bids that hit (3 points per trick).
- **The quiet look holds**: about 1,340 requests per match against 1,800 in run 003, `viewTable` 41 % of calls (all
  after an own action, run 004).

## Loopholes

None new.

## Problems

| # | Problem | Solution |
|---|---|---|
| P165 | Better calibration, no more hits. | answered: the reference itself hits 48 %; showing the worth at the bid lifts hits to 50 % and points threefold; in the retro it adds little |
| P220 | **Rounding down the reference**: with the worth shown, 36 % of bids are below it, 1 % above. | open: by design a model may doubt the number; a sharper estimate (the trump is named after the bids) would be the next lever if the game is taken up again |
| P96 | Notes over the word limit: 8-22 `BRAIN_TOO_LONG` per match. | open (P120) |

## Optimizations

- For any further Ember Tricks study, keep `mcBid` as the default arm: it is the only one that changes play beyond noise.
- The rest of `viewTable` (one look after each own action) is the next saving if the game is run at scale.

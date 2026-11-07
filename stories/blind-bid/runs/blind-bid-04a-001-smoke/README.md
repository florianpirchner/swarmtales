# blind-bid-04a-001-smoke

First live run of `blind-bid` (core story, `swt run --story blind-bid --provider anthropic --model haiku`):
4 Haiku seats, seed 31, the default match (3 games of 6 lots: pay-your-bid, pay-the-runner-up, shared-worth,
pay-your-bid, shared-worth, pay-the-runner-up), purse 100, strategy brain on (150 words). Run on 2026-11-06.
The story was named `lantern-auction` when it ran (the name in `run/`); it was renamed to Blind Bid before the merge so it is not confused with the word game Lanterns or the hint game Harbor Lights, and the old name stays an alias. A short smoke test on Flo's go ("Baue neue Spiele. Entscheide du!"); extensive runs come later.

**Result.** The match finished in 8 virtual minutes (48 allowed): 18 lots, 72 sealed bids, none missed, no bid
refused; 12 brain versions after 3 `BRAIN_TOO_LONG` refusals (P120). The signed log verifies (`swt log verify`).
Final points A04 56, A01 48, A03 43, A02 31. **Cost 0.025 USD**, 104 requests; the reporter draft cost
0.002 USD more (OpenRouter).

| Game | Points | Pay-your-bid: efficiency, shading (equilibrium) | Pay-the-runner-up: efficiency, bids at value | Shared-worth: sold at a loss, winner profit, bid/estimate | Purse unspent |
|---|---|---|---|---|---:|
| 1 | A01 5, A02 0, A03 23, A04 23 | 0.84, 0.66 (0.84) | 1.00, 6 of 8 (2 capped by the purse) | 1 of 2, 0, 0.57 | 48% |
| 2 | A01 14, A02 21, A03 13, A04 16 | 1.00, 0.82 (0.82) | 0.88, 6 of 8 (2 capped) | 1 of 2, 7, 0.61 | 43% |
| 3 | A01 29, A02 10, A03 7, A04 17 | 0.92, 0.69 (0.82) | 1.00, 6 of 8 (2 capped) | 0 of 2, 3.5, 0.73 | 43% |

Shading is the mean bid over value; the equilibrium is the symmetric single-lot bid 10 + 3/4 (v - 10) for the
same values. The logged `game_scored` events of this run report the runner-up truthfulness as 0.909, 0.872 and
0.935, because the reference then counted the six purse-capped bids as underbids; the reference now counts them
apart (`capped`), and over the uncapped bids truthfulness is 1.0 in every game (P160).

## Digest highlights

- **Pay-the-runner-up is solved before it is played.** On the first such lot all four bid exactly their value,
  each calling it "weakly dominant" (A04 #159, A03 #166, A01 #173; A02 "Second-price format", #180). Of the 24
  runner-up bids, 18 equal the value and the other 6 spend every coin left (#305, #554, #801).
- **The winner's curse is named on the first shared lot.** "Winning means my estimate is the highest of four
  noisy estimates, so the true worth is likely below 40 (winner's curse)" (A01 #211, also #197, #204). The
  seats bid far below their estimates (0.57-0.73 of the estimate), yet the curse still bit twice: A03 paid 35
  for a worth of 33 (#212), A01 60 for a worth of 56 (#461).
- **A01 writes the equilibrium into its brain.** After game 1: "Maximize (v-b)*((b-10)/51)^3. Roughly
  b = 10 + 0.6*(v-10)" (#325). After game 2 it shades harder still ("about 0.5*(v-10)+10 and accept losing
  many lots", #598) and wins game 3 with 29 points.
- **The brains learn in opposite directions.** A04, beaten by rivals bidding near the estimate, cuts its
  shared-lot margin from 8 to 3 ("Shading too hard left me with nothing", #582; bid 39 on estimate 42, #701);
  A03 widens its margin to 16-18 (#574, #708). A02, with 0 points in game 1, raises its pay-your-bid bids to
  80-90 percent of value (#355) and wins two lots in game 2.
- **The purse binds the aggressive seat.** A03 spends 67 coins on the first five lots of game 1 and can bid
  only 33 on a lot worth 53 to it (#305); A02 is down to 17 coins after lot 2 of game 2 (#439). The table as a
  whole leaves 43-48 percent of the purse unspent although unspent coins are worth nothing (P163).

## Loopholes

None seen. No seat bid out of turn, above its coins or twice on a lot; the deal and the bids stayed sealed
(`lots_dealt` and `bid_placed` have audience `human`). The reporter's candidates ("private reasoning instead of
bidding", "waiting out the clock") are wrong: they come from its city metrics (P89), every lot got four bids.

## Problems

- **P160, the purse reads as underbidding.** All six runner-up bids below the value used every coin left; the
  reference counted them as untruthful. Fixed in this PR: `capped` is counted apart.
- **P161, neutral names do not hide auction theory** (as P92 in the econ lab): the dominant strategy and the
  curse are recited from lot 1, so the runner-up lots show no learning curve.
- **P162, shared lots are over-shaded and the curse is small:** 4 bidders and an error of ±15 make the curse a
  few points; the brains disagree on the margin and drift apart.
- **P163, the purse binds unevenly:** almost half the coins are left unspent by the cautious seats, while the
  aggressive one runs dry.
- **P120 again:** 3 brain writes over the 150-word cap (153-175 words, #319, #341, #568); every seat got its
  brain in on the next try.
- **P89 again:** the reporter draft is shaped for the City of Keys. It said no bid was ever placed and the bid
  tool never opened (wrong: 72 bids, #125 onwards), and listed "log issues" for the mechanics' events. Its
  digest of the reasoning was right; this README replaces its problems and optimizations.

## Optimizations (proposals, not built)

1. **Unfamiliar formats** so the game measures reasoning, not recall: a third-price lot, an all-pay lot, or a
   lot that pays the runner-up a share; each with its own closed-form reference (P161).
2. **A sharper curse:** 8 bidders (two tables of four seeds, or 8 seats) or an error of ±25, and four shared
   lots a game; then the curse-free ceiling is far below the estimate and naive bidding loses clearly (P162).
3. **Make saving a real choice:** unspent coins worth a third of a point, or a purse of 80 with a seventh lot
   announced as the richest; that turns the purse into a dynamic budget problem (P163).
4. **The control arm next:** `blind-bid-nobrain` on the same seed, and 3 seeds each, before any claim
   that the brain changes shading.
5. **Brain cap:** say the word count in the retro line (P120).

# ember-tricks-04a-003-levers

Nine long Haiku matches of `ember-tricks` on 2026-11-06, run in parallel: the full game (8 rounds, 1 to 8 cards),
4 games per match, notes on in every arm, seeds 31, 32, 33. One lever per arm against the control (P136, P137):

- **control** (`ember-tricks-g4`): as in run 002, plus the new free `viewTable` (no step cost; a seat not on turn
  gets only "Not your turn: waiting for A03").
- **sum** (`ember-tricks-sum-g4`): the table also shows "Tricks bid so far: 2 of the round's 6 (2 bid(s) still to come)".
- **calib** (`ember-tricks-calib-g4`): the end-of-game record in the retro ends with the seat's own line, for example
  "Your calibration this game: you bid 6 tricks in all and took 10 over 8 rounds; 6 of 8 bids hit; 3 of your bids
  were 0. In short, you took 0.5 more trick(s) per round than you bid: you underbid." (calib-s31, A03, game 1).

4 seats each, 1,152 bids in all. About 38 minutes wall time per match; all nine ended by the referee after game 4.
Each folder holds `000-run.json`, the signed log (`events.jsonl.gz`, `events.chain.jsonl.gz`, `run.pub`) and
`usage.json`; the transcripts were not kept. Calibration from
`pnpm exec tsx --conditions=development scripts/ember-calibration/analyze.ts stories/ember-tricks/runs/ember-tricks-04a-003-levers/<arm>-s3*/`.
The reporter (OpenRouter) was not run; this README is the hand-written run report.

## Result

| Arm | Seed | Hits | Zero bids | Mean bid | Bid - MC | Points per seat-round | Wins (A01-A04) | Vetoes | Cost |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| control | 31 | 56/128 (44 %) | 51 % | 0.53 | -0.60 | 0.42 | 2 / 0 / 0 / 2 | 5 | 0.28 USD |
| control | 32 | 58/128 (45 %) | 65 % | 0.38 | -0.73 | 0.02 | 0 / 4 / 0 / 0 | 7 | 0.27 USD |
| control | 33 | 60/128 (47 %) | 59 % | 0.44 | -0.67 | 1.16 | 1 / 1 / 1 / 1 | 6 | 0.29 USD |
| sum | 31 | 51/128 (40 %) | 60 % | 0.44 | -0.70 | -0.39 | 2 / 1 / 0 / 1 | 8 | 0.28 USD |
| sum | 32 | 67/128 (52 %) | 58 % | 0.45 | -0.66 | 1.87 | 1 / 1 / 1 / 1 | 6 | 0.29 USD |
| sum | 33 | 53/128 (41 %) | 60 % | 0.43 | -0.68 | -0.02 | 1 / 0 / 2 / 0 | 7 | 0.29 USD |
| calib | 31 | 68/128 (53 %) | 43 % | 0.63 | -0.51 | 2.25 | 0 / 2 / 0 / 1 | 6 | 0.28 USD |
| calib | 32 | 53/128 (41 %) | 41 % | 0.67 | -0.44 | 0.70 | 3 / 0 / 0 / 1 | 6 | 0.29 USD |
| calib | 33 | 54/128 (42 %) | 44 % | 0.61 | -0.50 | 0.45 | 2 / 1 / 1 / 0 | 9 | 0.28 USD |

By arm (384 bids each; Monte Carlo expectation 1.12 tricks, taken 1.13 in every arm):

| Arm | Hits | Zero bids | Mean bid | Bid - MC | Game 1 bid | Games 2-4 bid | Points per seat-round |
|---|---:|---:|---:|---:|---:|---:|---:|
| control | 45 % | 58 % | 0.45 | -0.67 | 0.71 | 0.36 | 0.53 |
| sum | 45 % | 59 % | 0.44 | -0.68 | 0.73 | 0.35 | 0.62 |
| calib | 46 % | 42 % | 0.64 | -0.48 | 0.67 | 0.63 | 1.13 |

**Cost 2.54 USD** for nine matches (36 games, about 0.071 USD per game; 16,167 requests). 0 forfeits, 0 rule breaks,
0 `STEP_LIMIT` refusals (run 002: up to 18 per match).

## Digest highlights

- **The calibration line works, partly.** Game 1 is the same in every arm (no retro yet). From game 2 on the
  control falls back to 0.36 tricks per bid (71 % zero bids in game 2), the calibration arm stays at 0.63 and
  keeps the zero bids at 38-50 %. The effect holds on all three seeds (mean bid 0.61-0.67 against 0.38-0.53), and
  the points per seat-round double (1.13 against 0.53). Hits do not rise (46 % against 45 %): the bids move toward
  the reference but stay about half a trick short.
- **The notes learn the number.** calib-s31, A03 after game 3: "Bidding (main leak in games 2 and 3: we underbid by
  about 0.8 tricks a round) ... Bid 0 only with no trump and no card above the middle of any suit. Never bid 0
  with a 7+ or 8+ card hand." The control's notes say similar things (run 002) without the number, and the bids
  ignore them (P137).
- **The bid sum changes nothing.** Every number within the seed spread of the control (zero bids 59 % against 58 %,
  bid - MC -0.68 against -0.67). The players see that the bids add up to far less than the tricks and still bid 0;
  the sum tells about the table, not about their own hand.
- **The free `viewTable` ended the step refusals, not the calls.** `viewTable` is still 50 % of all calls; 99 % of
  them get the wait line. Cause: the answer of the look itself wakes the seat for another turn (the context ends
  with an unanswered tool result), so an idle seat looks, is woken, looks again, up to 8 times a minute. Fixed after
  this run in the kernel (a free look does not wake), checked in run 004.

## Loopholes

None new.

## Problems

| # | Problem | Solution |
|---|---|---|
| P95 | **`viewTable` still half the calls** with no step cost and a wait line: the look's own answer keeps the idle seat awake (2,449 of 2,472 control-arm looks got the wait line). | built after this run: a free look's answer does not wake the resident (`activation: "onNews"`); run 004: game 1 requests 449 → 327, `viewTable` 215 → 137 |
| P96 | Notes over the word limit: 42-53 `BRAIN_TOO_LONG` per arm (14-23 per match). | open (see P120; Quarry's fix on main names the cap in lines) |
| P136 | Systematic underbidding. | calibration line: mean bid 0.45 → 0.64, zero bids 58 % → 42 %, bid - MC -0.67 → -0.48, points per seat-round 0.53 → 1.13; hits unchanged. Bid sum: no effect. |
| P137 | Notes do not change bidding. | answered in part: notes with the seat's own number change the bids from game 2 on; notes without it do not |
| P165 | **Hits do not rise with better calibration**: the calibration arm bids closer to the reference but hits 46 % like the control. | open. Proposed: the calibration line with the reference (MC expectation of the seat's own hands, not only bid against taken); or the line at bidding time, not only in the retro |

## Optimizations

- Keep the calibration line on (default for the next version); drop the bid sum lever.
- The remaining requests are the idle seats' look after their own action (run 004): the next step would be a
  rule that a seat's turn ends after its action unless it is still on turn.

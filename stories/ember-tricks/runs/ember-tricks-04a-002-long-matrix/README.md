# ember-tricks-04a-002-long-matrix

Six long Haiku matches of `ember-tricks` with the harder miss cost (5 + error squared, P97), run in parallel on
2026-11-06: the full game (8 rounds, 1 to 8 cards), 4 games per match, notes on (`ember-tricks-g4`) and off
(`ember-tricks-nobrain-g4`), seeds 31, 32, 33. 4 seats each, 768 bids in all. About 38 minutes wall time per match,
222 virtual minutes allowed, all six ended by the referee after game 4. Each folder holds `000-run.json`, the
signed log (`events.jsonl.gz`, `events.chain.jsonl.gz`, `run.pub`) and `usage.json`; the transcripts were not kept.

Bid calibration from `scripts/ember-calibration/analyze.ts` (Monte Carlo expectation of tricks per hand at bidding
time, 400 samples): `pnpm exec tsx --conditions=development scripts/ember-calibration/analyze.ts stories/ember-tricks/runs/ember-tricks-04a-002-long-matrix/*/`.

The reporter (OpenRouter) was not run; this README is the hand-written run report.

## Result

| Arm | Seed | Hits | Zero bids | Bid - MC | Points per seat-round | Wins (A01-A04) | Vetoes | Cost |
|---|---|---:|---:|---:|---:|---|---:|---:|
| notes | 31 | 52/128 (41 %) | 55 % | -0.66 | -0.05 | 0 / 1 / 1 / 2 | 9 | 0.35 USD |
| notes | 32 | 58/128 (45 %) | 59 % | -0.66 | 0.88 | 2 / 0 / 0 / 2 | 8 | 0.37 USD |
| notes | 33 | 51/128 (40 %) | 64 % | -0.72 | -0.43 | 1 / 2 / 0 / 1 | 4 | 0.35 USD |
| none | 31 | 65/128 (51 %) | 61 % | -0.72 | 1.41 | 0 / 2 / 1 / 1 | 4 | 0.32 USD |
| none | 32 | 55/128 (43 %) | 57 % | -0.65 | 0.20 | 2 / 1 / 0 / 1 | 9 | 0.32 USD |
| none | 33 | 52/128 (41 %) | 57 % | -0.64 | 0.04 | 1 / 1 / 1 / 1 | 7 | 0.32 USD |

By game, summed over the three seeds of an arm (96 bids per cell):

| Arm | Game 1 | Game 2 | Game 3 | Game 4 |
|---|---|---|---|---|
| notes: hits, zero bids, bid - MC | 42 %, 38 %, -0.40 | 41 %, 79 %, -0.93 | 42 %, 55 %, -0.62 | 44 %, 66 %, -0.77 |
| none: hits, zero bids, bid - MC | 45 %, 51 %, -0.57 | 43 %, 63 %, -0.75 | 48 %, 53 %, -0.58 | 44 %, 67 %, -0.79 |

**Cost 2.03 USD** for six matches (24 games, about 0.085 USD per game; 10,890 requests). 0 forfeits, 0 rule
breaks; every out-of-turn or wrong-phase call was refused by the engine.

## Digest highlights

- **Everybody underbids, all the time.** The mean bid is 0.44 tricks against 1.13 taken and a Monte Carlo
  expectation of 1.12; 59 % of all bids are 0 even in the 8-card round. The harder miss cost did not move it.
  The reference matches what was taken (1.12 against 1.13), so the gap is the players', not the reference's.
- **The notes know, the bids do not.** After game 1 the notes praised the zero bid, and game 2 of the notes arm
  had 79 % zero bids (the control arm 63 %). By game 3 the notes say the opposite: "Count likely winners
  honestly ... Bid that number, not 0 by reflex" and "a gap of 1 costs only 6, so a moderate bid beats 0"
  (brain-s33, A01). Game 4 still had 66 % zero bids. Hits: notes 42 %, none 45 %; no learning curve in
  either arm.
- **The game punishes the reflex.** brain-s33 notes: "game 2: A02 took 16 on 0 bids, -59". The worst seat of
  the matrix ended at -104 points over four games (brain-s31, A01).
- **The veto is used**: 41 vetoes in 24 games.

## Loopholes

None new. LH12 (trump named against another zero bidder) was not counted here.

## Problems

| # | Problem | Solution |
|---|---|---|
| P95 | **`viewTable` is still half of all calls** (50-53 %) after the briefing said the status line is complete and not to call it first. Out-of-turn calls: 18-51 `NOT_YOUR_TURN` per match. | open: tried a briefing line (no effect). Next: give `viewTable` no step cost and answer a seat not on turn with one line ("Waiting for A03") |
| P96 | **Notes over the word limit** still: 16-18 `BRAIN_TOO_LONG` per notes match at 200 words; the notes come in at 197-199 words on a retry. | partly fixed: 200 words. Next: say the limit in the retro line, or count words for the writer before it calls |
| P97 | Zero bids were almost free. | built: a miss costs 5 + error squared (`scoring.missBase`). Did not change the bids: 59 % zero bids (P136) |
| P136 | **Systematic underbidding**: mean bid 0.44 against 1.12 expected, 59 % zero bids, 43 % hits, about 0.3 points per seat and round. | open. Proposed: show the seat its own count of likely winners next to its hand, or a bid sum hint ("bids so far: 1 of 6 tricks"); test against the reference |
| P137 | **Notes do not change bidding.** Same hits and the same bid error with and without notes; the notes state the right rule from game 3 on and the bids ignore it. | open. Proposed: put the seat's own calibration line from the reference into the retro ("you bid 0.4 a round, you took 1.2"); or read the notes back at the bid, not only at the round's start |

## Optimizations

- P95 is half the requests and most of the cost: fix it before larger runs.
- The reference script is enough for calibration now; a live listener is not needed for the next step.
- The next version should test one change against the control at a time (bid sum hint, or calibration line
  in the retro), with these six matches as the baseline.

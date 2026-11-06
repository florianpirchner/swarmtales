# holdem-04a-002-brain-vs-nobrain

The first comparison of the strategy brain in Hold'em, run on Flo's go on 2026-11-06. There are eight
live runs with 4 Haiku seats each (`--provider anthropic --model haiku`), all with the default match: four
games of eight duplicate hands, fixed limit 1/2 with bets of 2 and 4. The runs went in parallel. The arms:

- `holdem`: every seat keeps a brain. Seeds 41, 42, 43.
- `holdem-nobrain`: the same briefings, no brain and no retro. Seeds 41, 42, 43, so the deals are the same as the brain arm's.
- `holdem-mixed`: A01 and A03 keep a brain, A02 and A04 do not, on the same duplicate cards. Seeds 41 and 42.

In the pure arms every seat plays under the same condition and the points are zero-sum, so these arms
compare *style*. Only the mixed table compares *points*: the duplicate deals give every seat every
position's cards once, so a gap between the brain seats and the no-brain seats does not come from the
cards.

All eight runs finished all 32 hands. No decision was missed, and every signed log verifies.
**Cost 2.47 USD** for 512 hands (8 x 32): 0.23-0.43 USD per run, with the no-brain runs the dearer ones
(more calls, more decisions). The reporter drafts cost about 0.05 USD more (OpenRouter).

## Result

| | `holdem` (brain, 12 seats) | `holdem-nobrain` (12 seats) | mixed: brain seats (4) | mixed: no-brain seats (4) |
|---|---:|---:|---:|---:|
| VPIP, game 1 | 0.74 | 0.72 | 0.69 | 0.66 |
| VPIP, game 4 | **0.55** | 0.69 | **0.44** | 0.72 |
| VPIP, all games | 0.60 | 0.73 | 0.56 | 0.72 |
| Aggression ((bets + raises) / calls) | 0.64 | 0.52 | 0.74 | 0.50 |
| Calls per run | 181, 147, 140 | 250, 210, 234 | | |
| Folds per run | 64, 71, 76 | 44, 57, 54 | | |
| Showdowns per run (of 32 hands) | 19, 19, 13 | 25, 25, 27 | | |
| Agreement with the baseline | 0.66 | 0.68 | 0.67 | 0.67 |
| Baseline EV loss per decision | 0.30 | 0.21 | 0.26 | 0.24 |
| Net points per seat and game | (zero-sum) | (zero-sum) | **+5.6** | **-5.6** |

Mixed tables in detail. The brain seats (A01 + A03) finished +61 at seed 41 and +29 at seed 42, so the
no-brain seats were -61 and -29. The brain seats came out ahead in 6 of the 8 games, and both runs lost
game 4 (-24 and -7). Per seat and game the brain seats average +5.6 points, with a spread of about 35
and a standard error of about 9. **That is not significant**: it is a hint pointing the same way as the
style result, not a result.

| Run | Final points |
|---|---|
| holdem-s41 | A02 +44, A04 +11, A03 -26, A01 -29 |
| holdem-s42 | A03 +48, A04 +4, A02 -15, A01 -37 |
| holdem-s43 | A01 +55, A02 +15, A03 -31, A04 -39 |
| holdem-nobrain-s41 | A02 +45, A01 +6, A04 -20, A03 -31 |
| holdem-nobrain-s42 | A03 +87, A02 -8, A01 -37, A04 -42 |
| holdem-nobrain-s43 | A02 +66, A03 +41, A01 -44, A04 -63 |
| holdem-mixed-s41 (brain: A01, A03) | A01 +76, A02 +29, A03 -15, A04 -90 |
| holdem-mixed-s42 (brain: A01, A03) | A02 +38, A03 +21, A01 +8, A04 -67 |

## Digest highlights

- **The brain makes Haiku tighter.** This is the clearest effect, and it shows in every run. With a brain, the
  share of hands a seat plays drops from 0.74 in game 1 to 0.55 in game 4. Without one it stays near 0.7 in
  every game. At the mixed table the two brain seats fall to 0.44 while their no-brain neighbours stay at
  0.72 on the same cards. The brains write the lesson down in plain words, for example "many players reach
  showdown with one pair and lose. Be selective" (as in the smoke run).
- **No brain means a calling station.** The no-brain runs have 210-250 calls against 140-181 with a brain,
  fewer folds, and a showdown in 25-27 of 32 hands against 13-19. The ranges of the two arms do not overlap.
- **More aggressive, too.** With a brain, bets and raises per call rise from 0.52 to 0.64, and at the mixed
  table from 0.50 to 0.74.
- **The points lean toward the brain, weakly.** The brain seats of the mixed tables are +90 over 64 hands.
  That is within the noise of two runs (see above).
- **The baseline disagrees with the points.** Brain seats lose more one-street EV against the equity
  baseline (0.30 per decision against 0.21), because they fold more. The baseline counts every fold
  against a bet as a loss when the equity against *random* hands is high (P134). By that measure the
  tighter, winning seats look worse. It stays a sanity check, not a score.

## Loopholes

None found. The reporter's loophole candidates are its city frame (P89) or ordinary behaviour, and I
checked each one:
- "Decisions in reasoning while `act` was refused" is P131: the seat is woken out of turn and the lock
  holds.
- "Waiting instead of deciding" happens only when it is not the seat's turn.
- "Brain writes the city did not record": the brains are recorded as written. The refusals were
  `BRAIN_DISABLED` for the no-brain seats of the mixed table, which also hold `readBrain` and
  `writeBrain` (the grants are per role, not per seat).
- "Strategy notes in self-talk": thinking text does not carry across games, because of the context reset.

## Problems

| # | Problem | Solution |
|---|---|---|
| P131 | **Seats still act out of turn**: 27-72 TOOL_LOCKED per run (about 50; the smoke run had 52). The reply fix of PR #107 did not help. The real cue is the record line: a seat woken to answer its last tool result reads "A04 bets 4." and calls, although another seat is to act. | built in this PR: when a seat gets new record lines and is not to act, the inputs end with "Not your turn: X is to act. End your turn". The control run [holdem-04a-003-input-fix](../holdem-04a-003-input-fix/) has 7 instead of about 48 |
| P132 | **Board-made hands are still called on the river.** 0-9 river calls per run with equity under 0.02. The seats now say "pair of aces on the board" and call for the pot odds anyway (bluff-catching). | partly fixed: the misreading is gone, the bluff-catch with a hand the board makes is a strategy leak. Left as it is: it is play, not a bug |
| P134 | The baseline ranks the tighter, winning brain seats below the calling stations (see above). | open, as proposed: equity against an action-narrowed range |
| P138 | **The mixed table hands `readBrain` / `writeBrain` to the no-brain seats too.** They answer `BRAIN_DISABLED`, a few seats try them, and the reporter reads that as a loophole. | open: grants per seat (a kernel-side `grants` by resident), or the brain mechanic hiding its tools from seats without a brain |
| P139 | **Too few runs for points.** Two mixed tables give a standard error of about 9 points per seat and game against an effect of 5.6. | proposed: six to eight mixed tables (about 0.3 USD each) for a points result; the style result needs no more |
| P89 | The reporter is still city-shaped. | open |

## Optimizations

- For the points question, run only mixed tables: every one gives a brain-versus-no-brain contrast on the
  same cards, while pure arms only compare style.
- The no-brain arm costs about 40% more (more calls mean more decisions and longer hands).
- Eight parallel runs took about 75 minutes of wall time and came nowhere near the Haiku limits.

## Notes

- Code: the mixed arm (`holdem-mixed`, option `brainSeats`) is new in this PR. The runs used the code of
  PR #107 plus that option; the P131 input fix came after them.
- Files: one folder per run (`<arm>-s<seed>/`) with `events.jsonl` (+ chain and public key), `usage.json`,
  `agents/` (transcripts) and the reporter draft `REPORT.md`.

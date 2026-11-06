# holdem-04a-003-input-fix

A control run for the second P131 fix, run on 2026-11-06 right after [holdem-04a-002](../holdem-04a-002-brain-vs-nobrain/).
It is `holdem` with seed 44: 4 Haiku seats, the brain on, four games of eight duplicate hands. The code is
this PR's: a seat that is woken without being the one to act now reads "Not your turn: X is to act. End
your turn" after the new record lines.

**Result.** 32 hands, 412 decisions, none missed, and the signed log verifies. Final points: A04 +69,
A03 +6, A01 -1, A02 -74. **Cost 0.20 USD** for 783 requests. The reporter draft cost about 0.006 USD more.

| | Before the fix (`holdem`, seeds 41-43) | This run |
|---|---:|---:|
| `act` refused with TOOL_LOCKED (out of turn) | 54, 41, 50 | **7** |
| Requests per decision | 2.04, 2.00, 2.10 | **1.90** |
| Cost | 0.25-0.28 USD | 0.20 USD |
| VPIP game 1 to game 4 | 0.74 to 0.55 (mean) | 0.69 to 0.56 |

## Digest highlights

- **The fix works.** Out-of-turn attempts fall from about 48 per run to 7, and the cost falls by about a fifth.
- **The brain effect holds on a fourth seed.** VPIP goes from 0.69 in game 1 to 0.56 in game 4, the same
  tightening as in the brain arm of the series.

## Loopholes

None found.

## Problems

| # | Problem | Solution |
|---|---|---|
| P131 | Out-of-turn `act`: 7 are left, from seats that act on a thought from their own earlier turn. | fixed (enough; the lock holds in every case) |
| P89 | The reporter is still city-shaped (`run/REPORT.md`). | open |

## Optimizations

None new; see the series README.

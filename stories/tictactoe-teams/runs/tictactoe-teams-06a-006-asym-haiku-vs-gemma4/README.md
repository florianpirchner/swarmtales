# tictactoe-teams-06a-006-asym-haiku-vs-gemma4

Nine matches, three games each, on 3x3: team X (A01-A03) is Haiku via Anthropic, team O (A04-A06) is `google/gemma-4-26b-a4b-it` via OpenRouter (`--resident-model A04,A05,A06=openrouter/google/gemma-4-26b-a4b-it`). Three arms, seeds 1-3 each, no personas, no gamemaker. Run in parallel on 2026-11-04. Total cost **about 0.84 USD**; 23-42 virtual minutes per match.

| Arm | Story | Brain | Matches (X / draw / O per game) |
|---|---|---|---|
| nobrain | `tictactoe-teams-nobrain` | none | s1 X X X, s2 X O X, s3 draw X draw |
| braino | `tictactoe-teams-brain-o` | Gemma team only | s1 draw draw X, s2 X draw draw, s3 X draw X |
| brainboth | `tictactoe-teams` | both teams | s1 draw draw X, s2 draw draw X, s3 X X draw |

**Result (9 games per arm).** nobrain: X 6, draw 2, O 1. braino: X 4, draw 5, O 0. brainboth: X 4, draw 5, O 0. Cost per match: nobrain 0.05-0.08, braino 0.08-0.10, brainboth 0.12-0.14 USD.

**Reading (corrected after a game-by-game check).** All 14 X wins contain a forfeited Gemma move (a random cell after three rounds without agreement) that missed a block or was a blunder; every non-forfeit Gemma move that was scored was optimal. The only O win (nobrain-s2, game 2) was a real Haiku error (no block at X move 4) after a Gemma forfeit. Forfeits per arm: nobrain 10, braino 10, brainboth 12. So the differences between the arms (6/2/1 against 4/5/0) are not separable from the luck of the random forfeit cells, and the experiment shows **no brain effect**. Haiku beats Gemma only because Gemma is too slow to agree (P81). With n=9 games per arm this is also too small to say more.

**Forfeits.** All forfeits are Gemma's: team O 1-5 per match, team X none (P81). The one O win (nobrain-s2) came from a Haiku blunder, not from a forfeit.

**The Gemma brains.** Version 1 is a four-line textbook list (centre, corners, win/block, watch forks, vote quickly). Later versions add a few conditions ("if the opponent holds the centre, block branching paths", "verify the board state before claiming a cell is occupied") but stay general; no position-keyed rules appeared. Haiku's brain in brainboth grows to about 280 words with a full priority ladder (win, block, fork, block fork, centre, opposite corner).

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P81 | Forfeits still come only from the slow model and confound the brain effect. | open: raise `maxRounds` for slow models and count forfeits separately in the score |
| P83 | Slow wall-clock with OpenRouter, mitigated here by running nine matches in parallel. | worked around by parallel runs |
| P85 | Identical openings across games and seeds are still likely; not measured here. | open |

## Notes

- Layout: one folder per match (`<arm>-s<seed>/`). The agent prompts are kept once, in `nobrain-s1/agents/`, because the other runs differ only in the brain.
- Reporter (OpenRouter) was not run; this README is the hand-written report.

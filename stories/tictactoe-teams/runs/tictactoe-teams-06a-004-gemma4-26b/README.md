# tictactoe-teams-06a-004-gemma4-26b

`swt run --story tictactoe-teams --provider openrouter --model google/gemma-4-26b-a4b-it`, 6 residents on the same model, 3 games, strategy brain on, no personas, no gamemaker, seed 11. Run on 2026-11-04. Gemma 4 makes native tool calls, so no `--tool-choice` was needed.

**Result.** Game 1 draw, game 2 **O** (diagonal 2-4-6), game 3 draw: X 0, O 1, draw 2. 23 moves, 33 virtual minutes (about 1 hour 35 minutes of real time), **0.124 USD**, 393 requests. Of 14 scored moves 13 were optimal and 1 was a missed block, and that one was a forfeit.

**The brain.** Six versions (version 1 before game 1, then one per game), 64-103 words each. Version 1 was textbook rules ("take the centre, block, corners, forks"). After game 1 team O turned it into conditional rules ("if you start: centre/corners; if second: block at once") after A06 had twice voted against a corner "because the centre has priority" although X held the centre. Team X added "do not only react, build forks" and, after the loss, a rule for the case that the opponent holds the centre. By version 3 both brains were still lists of general rules, no position-keyed rules.

## Loopholes

None seen. Consensus held: every played cell except the 5 forfeits was the agreed one; no cross-team reads.

## Problems

| # | Problem | Solution |
|---|---|---|
| P81 | **Forfeits decide games.** Team X ran out of rounds without a consensus 5 times (minutes 5, 12, 19, 27, 31), team O never. The loss in game 2 came from one of them: a random cell (5) instead of the blocking 6. The 3-round limit is too tight for a slow model, and a forfeit is a random move that the scorer counts as a quality move. | open: raise `maxRounds` for slow models (story option), report forfeits apart in the scores |
| P82 | **A brain without conditions misleads.** Version 1 of team O said "centre first" without "if free"; A06 voted down two sound corner moves with that rule. | open: nothing to fix in the code; the retro repaired it in one game, which is the behaviour the experiment wants to measure |
| P83 | **Wall-clock time.** One game takes 12-25 minutes with this model because OpenRouter answers each request in about 10 seconds; the match took 1 h 35 min. | open: lower `maxStepsPerMinute`/passes or run teams in parallel |

## Notes

- Cost per game about 0.04 USD, against 0.02 USD with Haiku (run 001).
- Retries were raised to 6 for provider requests (`PROVIDER_RETRIES` in `packages/models/src/source.ts`) after the Gemma 3 runs hit 429 on 50 % of requests.
- The reporter (OpenRouter) was not run; this README is the hand-written report.

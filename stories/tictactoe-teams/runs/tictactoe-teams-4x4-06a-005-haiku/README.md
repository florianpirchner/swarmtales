# tictactoe-teams-4x4-06a-005-haiku

`swt run --story tictactoe-teams-4x4 --provider anthropic --model haiku`: 6 Haiku residents, 4x4 board with four in a row, 3 games, strategy brain on, no personas, no gamemaker, seed 11. Run on 2026-11-04.

**Result.** Three draws (X 0, O 0, draw 3), 48 moves, 42 virtual minutes (about 15 minutes of real time), **0.197 USD**, 735 requests. No forfeit, no failed turn. The first move of every game was cell 5, the second 10, the third 6 in games 1 and 2: the teams settled on one opening line. Only 3 of the 48 moves were scored, all optimal: on 4x4 the referee finds a difference between moves only in few positions (most positions are draws whatever is played), so most moves carry no signal.

**The brain.** Far richer than on 3x3: 219-243 words per team in version 1 already, with a priority list (win, block, block the opponent's double threat, make our own double threat, centres 5/6/9/10 before corners before edges, "count threats, not cells"), a captain routine (scan all lines through the opponent's last move) and a voter checklist (vote no if a win, a block or an opponent fork was missed). Team X also asked for a retro note on which opening worked. Content is general strategy, no position-keyed rules.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P84 | **Haiku still draws, and the referee sees little.** Three draws again; 4x4 with four in a row is a draw with decent play, and 45 of 48 moves were in positions where all moves are equal. No error to learn from, so the brain cannot show a learning curve. | open: a game with a forced win for one side that must be found (5x5 with four in a row is still a draw; 6x6 with four in a row is a first-player win but too large for the exact scorer), a weaker model on one team, or a gamemaker that creates pressure; the brain experiment E1 needs room to err |
| P85 | **Identical openings.** Games 1 and 2 share the first six moves, so the teams repeat one line. | open: expected with fixed seed and no personas; personas or a varied start would break it |

## Notes

- Cost per game about 0.066 USD, against 0.023 USD for 3x3 with Haiku (run 001).
- The reporter (OpenRouter) was not run; this README is the hand-written report.

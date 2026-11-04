# tictactoe-teams-06a-002-gemma12b-429

`swt run --story tictactoe-teams --provider openrouter --model google/gemma-3-12b-it`, 6 residents, 3 games, brain on, 2026-11-04. **Invalid run.**

**Result.** All 58 model requests failed with `429 temporarily rate-limited upstream` (DeepInfra, `engine_overloaded`); OpenRouter showed 0 % uptime for the 12B endpoint with tool support at that time. Every move was a consensus forfeit (16 random legal moves), two games ended 3-4-5 for X by chance. Cost 0.00 USD.

## Loopholes
None (nothing was played by the models).

## Problems
| # | Problem | Solution |
|---|---|---|
| P79 | The run goes on after every request fails: 58 of 58 turns errored and the match still ran to the end on forfeits, producing a result that looks like a game. | open: stop the run (or mark it invalid) when all requests of a minute fail, or after N consecutive provider errors |

# tictactoe-teams-06a-001-smoke

First live run of `tictactoe-teams` (core story, `swt run --story tictactoe-teams --provider anthropic --model haiku`):
6 Haiku residents, seed 11, 3 games, strategy brain on, no personas, no gamemaker. Run on 2026-11-04.

**Result.** Three draws (X 0, O 0, draw 3), 27 moves, 24 virtual minutes (the 56 allowed were not needed). All 15
scored moves were optimal; no forfeit, no blunder. Six brain versions were written (one per team and
game, 237-297 words, all within the 300-word limit) and sit in the signed log (`swt log verify` accepts it).
**Cost 0.073 USD**, 496 requests (the paper estimated about 0.09 USD per game, so about 0.27 USD for three).

## Loopholes

None seen. The consensus gate held: every played cell was the voted one (27 `consensus_reached`, 27
`move_played`, 0 forfeits). No resident read the other team's chat or brain.

## Problems

| # | Problem | Solution |
|---|---|---|
| P76 | **60 turns failed with a 400** ("This model does not support assistant message prefill. The conversation must end with a user message"), 60 of 556 turns, spread over all six residents. A resident was woken while its conversation already ended with its own answer (no new turn input), probably through `wakeTeam` with `activation: onNews`. The failed turns cost nothing but did no work. | open: find which wake carries no input and either skip the turn or add a minimal input line |
| P77 | **No room to improve.** Haiku plays near-perfect tic-tac-toe on its own: 15 of 15 optimal moves and a draw in every game, with and without a growing brain. The brain mostly restates the textbook rules (priority list: win, block, fork, block forks, centre, corner). | open: the E0 pilot of the paper says exactly this; a harder game (`size 4`, `line 4`, misere) or a weaker model for one team is needed before E1 can show anything |


## Notes

- The reporter (OpenRouter) was not run; this README is the hand-written run report.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

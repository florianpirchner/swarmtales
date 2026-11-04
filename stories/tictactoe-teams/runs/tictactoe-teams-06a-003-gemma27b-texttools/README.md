# tictactoe-teams-06a-003-gemma27b-texttools

`swt run --story tictactoe-teams --provider openrouter --model google/gemma-3-27b-it`, 6 residents, 3 games, brain on, 2026-11-04. **Invalid run.**

**Result.** 58 requests, 0.009 USD, no request failed, but **no tool call was ever made**: Gemma wrote its calls as plain text (`[viewBoard()]`, `[postTeam(text="...")]`). So nobody proposed, voted or played; all 16 moves were consensus forfeits (random legal moves), the brain was never written. A direct curl with a single tool got a real `tool_calls` answer from the same model, so the failure is in the story run (system prompt or how the tools are sent to this model), not in the model's endpoint.

## Loopholes
None.

## Problems
| # | Problem | Solution |
|---|---|---|
| P79 | See run 002: a match with no model action still runs to the end. | open |
| P80 | **Gemma 3 does not use native tool calls in our stack**, it prints pseudo calls as text. | open: check how the models package sends tools for an unknown OpenRouter model (compat flags), or add a text-tool-call parser, or pick a small model with reliable native tools (e.g. a Qwen3 or gpt-oss size) |

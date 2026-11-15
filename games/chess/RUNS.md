# Runs of chess

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; the write-up of the M4 count is [`docs/M4-GATE.md`](../../docs/M4-GATE.md). Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 tokens.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| `chess-requests`: the arm `fresh-compact` (four games, at most 80 half-moves each, fresh context, compact board), seeds 41, 43, 47, 53 | `chess/chess-requests/` | `570801db` | `5b6336a6` | 4 | 4 matches, none excluded | 1.209 requests per half-move (range 1.196 to 1.238) beside the old 1.18 to 1.22 (runs 048 to 051); no pass rule. Refused moves 3.31 per 100 half-moves, 29 turns without a call | 1.1455 |

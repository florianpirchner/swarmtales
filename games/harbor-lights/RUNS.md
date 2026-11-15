# Runs of Harbor Lights

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; the write-up of the M4 series is [`docs/M4-GATE.md`](../../docs/M4-GATE.md). Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 4000 tokens.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| `harbor-lights-private-notes`: private notes (`solo`) against none (`nobrain`), one game per match, seeds 101 to 112 | `harbor-lights/harbor-lights-private-notes/` | `570801db` | `5b6336a6` | 4 | 12 pairs, none excluded | +1.58 points per game (SE 1.37, 95 % interval -1.44 to +4.61, exact sign-flip p 0.33): sign kept; the old +3.2 (SE 0.8) is not reproduced in size | 1.2814 |

# Runs of Lanterns

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; the write-up of the M4 series is [`docs/M4-GATE.md`](../../docs/M4-GATE.md). Model of every run:
`anthropic/haiku`, resolved to `claude-haiku-5-5`, thinking medium, output cap 16000 tokens.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| `lanterns-team-brain`: a team brain (`brain`) against none (`nobrain`), four games per match, the twelve seeds of `lanterns-06a-005` and `-006` | `lanterns/lanterns-team-brain/` | `570801db` | `5b6336a6` | 4 | 12 pairs, none excluded; three starts refused before any call and played again (P468) | +0.058 recall (SE 0.022, 95 % interval +0.010 to +0.106, exact sign-flip p 0.024): sign kept, the size agrees with the old +0.08 (SE 0.03); games 2 to 4 +0.048 (SE 0.020) against the old +0.11 | 1.6631 |

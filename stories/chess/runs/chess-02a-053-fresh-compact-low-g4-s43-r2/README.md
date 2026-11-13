# chess-02a-053-fresh-compact-low-g4-s43-r2

`swt run --story chess-fresh-compact-g4-p80 --provider anthropic --model haiku --seed 43 --budget 1 --thinking low` (both seats claude-haiku-5-5), `-fresh -compact` with `--thinking low`; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-13 on **runtime r2** (commit `1dbedb0`). Final points: A01 0.5, A02 3.5. **Cost 0.219 USD**, 343 requests for 296 half-moves (1.16 per half-move), 1030 output tokens per half-move, context 2.6k tokens on average and 5.1k at most; the reporter draft about 0.006 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **157**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 72 | A01 1, A02 1 | 171 / 178 | 8 / 9 | 0 |
| 2 | A02 | 1/2-1/2 | move cap, on material | 80 | A01 3 | 117 / 136 | 5 / 5 | 0 |
| 3 | A01 | 0-1 | checkmate | 64 | A02 3 | 204 / 166 | 10 / 8 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 1, A02 1 | 140 / 158 | 7 / 8 | 0 |

## Loopholes

None new. The cap grab of LH17 was not seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P342 | Thinking low halves the output of `-fresh` (1030 tokens per half-move against about 1,600 at medium, 048-051) and the cost (0.07 USD per 100 half-moves), but play falls off: ACPL 157 on this seed, 170 on the four seeds against 119 at medium. | open: keep medium for chess |
| P120 | 3 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

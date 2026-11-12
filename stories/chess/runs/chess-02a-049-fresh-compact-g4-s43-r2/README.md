# chess-02a-049-fresh-compact-g4-s43-r2

`swt run --story chess-fresh-compact-g4-p80 --provider anthropic --model haiku --seed 43 --budget 1` (both seats claude-haiku-5-5), `-fresh -compact` together; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 2.5, A02 1.5. **Cost 0.328 USD**, 356 requests for 301 half-moves (1.18 per half-move), 1693 output tokens per half-move, context 2.7k tokens on average and 9.2k at most; the reporter draft about 0.006 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **162**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 61 | A01 1, A02 1 | 175 / 214 | 5 / 6 | 4 |
| 2 | A02 | 1/2-1/2 | move cap, on material | 80 | A01 2, A02 1 | 161 / 155 | 6 / 7 | 0 |
| 3 | A01 | 1-0 | move cap, on material | 80 | A02 2 | 226 / 244 | 9 / 8 | 2 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 2 | 60 / 80 | 1 / 3 | 0 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P340 | A fresh context per half-move more than doubles the thinking: 1693 output tokens per half-move against about 700 with the context kept (013: 700, 045: 621), so the run costs as much as the default arm although the context shrank to 2.7k tokens. | open: a lower thinking level with `-fresh`, or keep the last move's thinking summary |
| P341 | The compact board alone did not help Haiku read the board (047: ACPL 153, blunders 18 per 100 moves, against 151 / 15.7 for 045 on the same seed). | open: one seed only |
| P120 | 6 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

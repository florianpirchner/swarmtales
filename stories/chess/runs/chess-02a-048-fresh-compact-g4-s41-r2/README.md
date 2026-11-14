# chess-02a-048-fresh-compact-g4-s41-r2

`swt run --story chess-fresh-compact-g4-p80 --provider anthropic --model haiku --seed 41 --budget 1` (both seats claude-haiku-5-5), `-fresh -compact` together; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 2.5, A02 1.5. **Cost 0.295 USD**, 340 requests for 283 half-moves (1.20 per half-move), 1585 output tokens per half-move, context 2.8k tokens on average and 14.9k at most; the reporter draft about 0.006 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)): ACPL **87**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 43 | - | 101 / 140 | 3 / 3 | 0 |
| 2 | A02 | 1-0 | move cap, on material | 80 | A02 1, A01 1 | 93 / 118 | 3 / 5 | 0 |
| 3 | A01 | 1-0 | move cap, on material | 80 | A02 3, A01 1 | 45 / 62 | 1 / 3 | 1 |
| 4 | A02 | 1/2-1/2 | move cap, on material | 80 | A02 1 | 89 / 82 | 2 / 2 | 1 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P340 | A fresh context per half-move more than doubles the thinking: 1585 output tokens per half-move against about 700 with the context kept (013: 700, 045: 621), so the run costs as much as the default arm although the context shrank to 2.8k tokens. | open: a lower thinking level with `-fresh`, or keep the last move's thinking summary |
| P341 | The compact board alone did not help Haiku read the board (047: ACPL 153, blunders 18 per 100 moves, against 151 / 15.7 for 045 on the same seed). | open: one seed only |
| P120 | 4 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

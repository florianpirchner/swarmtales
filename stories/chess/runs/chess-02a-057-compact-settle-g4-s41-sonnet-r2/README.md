# chess-02a-057-compact-settle-g4-s41-sonnet-r2

`swt run --story chess-compact-settle-g4 --provider anthropic --model sonnet --seed 41 --budget 10` (both seats claude-sonnet-5-5), `-compact -settle` with the context kept, cap 160 half-moves (the story default): the baseline for 056; four games with alternating colours (A01 is White in game 1), cap 160 half-moves. Run on 2026-11-13 on **runtime r2** (commit `f409e8c`). Final points: A01 3, A02 1. **Cost 3.054 USD**, 453 requests for 415 half-moves (1.09 per half-move), 325 output tokens per half-move, context 20.5k tokens on average and 54.0k at most; the reporter draft about 0.005 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)): ACPL **97**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 116 | A01 1 | 77 / 66 | 5 / 2 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 128 | A02 1, A01 2 | 108 / 93 | 5 / 6 | 1 |
| 3 | A01 | 1-0 | checkmate | 89 | A02 2, A01 1 | 127 / 148 | 5 / 7 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 82 | A01 3, A02 1 | 97 / 70 | 5 / 2 | 0 |

## Loopholes

None new. The reporter draft's candidates are city-shaped (P89); no game hit the cap, so LH17 could not occur.

## Problems

| # | Problem | Solution |
|---|---|---|
| P343 | The baseline for 056: the same match with the context kept. ACPL 97 against 88 with `-fresh` (056), 8.9 against 7.4 blunders per 100 moves, so the fresh context did **not** make Sonnet weaker; the ACPL of 63 in 041 came from games cut at move 40 (middlegame only). Cost 0.74 USD per 100 half-moves against 0.81 with `-fresh`: on r2, keeping the context is a little cheaper, because `-fresh` pays a cache write on every half-move (P344). Output 325 tokens per half-move; context 20.5k on average, 54k at most. | answered: no strength difference between the arms on this seed |
| P328 | Cap 160: no game reached it (82-128 half-moves; three resignations, one checkmate). | answered for Sonnet on this seed |
| P120 | 6 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

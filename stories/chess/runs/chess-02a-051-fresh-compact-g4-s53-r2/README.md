# chess-02a-051-fresh-compact-g4-s53-r2

`swt run --story chess-fresh-compact-g4-p80 --provider anthropic --model haiku --seed 53 --budget 1` (both seats claude-haiku-5-5), `-fresh -compact` together; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 3, A02 1. **Cost 0.323 USD**, 357 requests for 299 half-moves (1.19 per half-move), 1663 output tokens per half-move, context 2.8k tokens on average and 8.0k at most; the reporter draft about 0.006 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)): ACPL **129**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 73 | A01 1, A02 3 | 159 / 189 | 8 / 7 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A02 1 | 105 / 75 | 3 / 2 | 0 |
| 3 | A01 | 0-1 | move cap, on material | 80 | A01 1, A02 1 | 192 / 160 | 6 / 6 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 66 | A01 1, A02 1 | 86 / 58 | 3 / 1 | 0 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P340 | A fresh context per half-move more than doubles the thinking: 1663 output tokens per half-move against about 700 with the context kept (013: 700, 045: 621), so the run costs as much as the default arm although the context shrank to 2.8k tokens. | open: a lower thinking level with `-fresh`, or keep the last move's thinking summary |
| P341 | The compact board alone did not help Haiku read the board (047: ACPL 153, blunders 18 per 100 moves, against 151 / 15.7 for 045 on the same seed). | open: one seed only |
| P120 | 3 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |
| P445 | The reporter draft states as its first finding that "both residents never submitted a single move in 55 minutes" and that the tools were "locked or misconfigured". The log has 299 `move_played` events (150 by A01, 149 by A02), four finished games and a match result (A01 3, A02 1); `playMove` is open only for the seat on move. | built: a correction note at the top of `run/REPORT.md` lists the wrong statements against the log (2026-11-14); the reporter itself is still city-shaped (P89, open) |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89, with a correction note at its top, P445; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

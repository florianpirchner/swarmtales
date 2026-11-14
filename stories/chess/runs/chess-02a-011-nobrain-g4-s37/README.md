# chess-02a-011-nobrain-g4-s37

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 37`, `-nobrain` arm (no strategy brain); four games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of five four-game matches on the same seed (see the [runs index](../README.md)). Final points: A01 0, A02 4. **Cost 0.215 USD**, 374 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | checkmate | 70 | A02 2 | 163 / 127 | 4 / 5 | 0 |
| 2 | A02 | 1-0 | checkmate | 63 | A02 1 | 80 / 111 | 2 / 4 | 0 |
| 3 | A01 | 0-1 | A01 resigned | 60 | A02 2 | 281 / 248 | 10 / 11 | 0 |
| 4 | A02 | 1-0 | A01 resigned | 79 | 0 | 245 / 258 | 11 / 13 | 1 |

## Digest highlights

- **Two checkmates, both against A01.** Game 1 ended 33...Qxf1# and game 2 33. Rc8# (a back-rank mate); A02 won all four games.
- **Worse play late in the match.** ACPL per game 145, 95, 264, 251 (games 3-4 with 14. Qd3?? and 15. Nxd4?? back to back for A01); without a brain nothing carries over, and the second half was the weakest of any arm (P115).
- **22 blunders per 100 moves**, the most of the series.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves (the refusal hint of LH13 names only the moves of the piece written; refused moves stayed at 0.8-4 per 100 half-moves).

## Problems

| # | Problem | Solution |
|---|---|---|
| P115 | Without a brain ACPL 191 against 148 with one over four games. | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, "non-moves", the cap as a loophole). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

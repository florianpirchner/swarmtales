# chess-02a-009-moves-g4-s37

`swt run --story chess-moves-g4-p80 --provider anthropic --model haiku --seed 37`, `-moves` arm (legal moves listed); four games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of five four-game matches on the same seed (see the [runs index](../README.md)). Final points: A01 1, A02 3. **Cost 0.192 USD**, 315 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | A01 resigned | 58 | 0 | 106 / 91 | 4 / 2 | 0 |
| 2 | A02 | 0-1 | A02 resigned | 56 | 0 | 110 / 67 | 2 / 2 | 0 |
| 3 | A01 | 0-1 | A01 resigned | 52 | A02 1, A01 1 | 108 / 70 | 1 / 1 | 0 |
| 4 | A02 | 1-0 | A01 resigned | 53 | 0 | 52 / 83 | 0 / 1 | 0 |

## Digest highlights

- **The best arm again.** ACPL 86 (80 in the first series), one queen blunder in four games, 2 refused moves in 219 half-moves, and the cheapest of the brain arms (0.19 USD).
- **Every game ended by resignation**, between move 26 and 29; all four were lost positions for the resigner (engine -800 or worse).
- **Steady play.** ACPL per game 98, 88, 89, 67: the only arm without a bad game.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves (the refusal hint of LH13 names only the moves of the piece written; refused moves stayed at 0.8-4 per 100 half-moves).

## Problems

| # | Problem | Solution |
|---|---|---|
| P114 | Legal list again best (ACPL 86 vs 148 default). | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, "non-moves", the cap as a loophole). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

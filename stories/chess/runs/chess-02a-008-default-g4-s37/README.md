# chess-02a-008-default-g4-s37

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 37`, default arm (brain on, no list); four games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of five four-game matches on the same seed (see the [runs index](../README.md)). Final points: A01 3, A02 1. **Cost 0.322 USD**, 438 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | checkmate | 62 | A02 2, A01 2 | 178 / 141 | 7 / 6 | 1 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A02 2, A01 1 | 204 / 191 | 9 / 9 | 0 |
| 3 | A01 | 1-0 | move cap, on material | 80 | A01 2, A02 1 | 82 / 100 | 2 / 3 | 0 |
| 4 | A02 | 0-1 | A02 resigned | 76 | A01 2 | 163 / 127 | 5 / 5 | 0 |

## Digest highlights

- **Mate missed, then mated.** Game 1: the queens shuffled en prise from move 17 to 24 (17...Qb5, 18. Qd3, 23...Qb4, 24. Qd3, engine swings of 400-1000 each), A01 then missed 29. Qxg7# (played Bg5) and was mated six half-moves later (31...Qxe1#). The first checkmate of the series.
- **The most queen blunders of the four solo arms**: 13 of the blunders were queen moves (P113); the reporter's "waiting is a non-move" candidate is the locked `playMove` for the seat not on move, by design.
- **The brain helps over four games here**: ACPL per game 160, 197, 91, 145 against 145, 95, 264, 251 without a brain (P115).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves (the refusal hint of LH13 names only the moves of the piece written; refused moves stayed at 0.8-4 per 100 half-moves).

## Problems

| # | Problem | Solution |
|---|---|---|
| P113 | 13 queen blunders in four games. | open; `-threats` and `-moves` cut them |
| P115 | Brain against no brain: ACPL 148 vs 191 over four games each. | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, "non-moves", the cap as a loophole). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

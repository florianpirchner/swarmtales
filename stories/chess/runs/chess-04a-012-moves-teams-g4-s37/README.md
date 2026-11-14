# chess-04a-012-moves-teams-g4-s37

`swt run --story chess-moves-teams-g4-p80 --provider anthropic --model haiku --seed 37`, teams with the legal list (two teams of two, rotating captain); four games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of five four-game matches on the same seed (see the [runs index](../README.md)). Final points: A 3, B 1. **Cost 0.456 USD**, 657 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A | 1-0 | A03 resigned | 53 | 0 | 74 / 112 | 1 / 2 | 0 |
| 2 | B | 1/2-1/2 | move cap, on material | 80 | A02 2 | 226 / 228 | 12 / 13 | 2 |
| 3 | A | 1-0 | A04 resigned | 51 | 0 | 131 / 170 | 3 / 4 | 0 |
| 4 | B | 1/2-1/2 | move cap, on material | 80 | 0 | 57 / 50 | 1 / 1 | 0 |

## Digest highlights

- **At the same information, teams lose to a solo seat.** With the legal list the teams played ACPL 132 against 86 for two solo seats, at 2.4 times the cost (0.456 against 0.192 USD); per USD the solo `-moves` arm is far ahead (P116).
- **Two missed mates in a row.** Game 2, moves 22 and 25: team B (A04, then A03) had Bh6+ with a forced mate and played Be3 and Rc1 instead; the game was drawn at the cap.
- **256 team posts** (138 in the two-game teams run), one queen blunder. The reporter's candidates ("never engaged the level system", a failed sacrifice) are its city framing (P89) and bad chess.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves (the refusal hint of LH13 names only the moves of the piece written; refused moves stayed at 0.8-4 per 100 half-moves).

## Problems

| # | Problem | Solution |
|---|---|---|
| P116 | Teams with the legal list ACPL 132 vs solo 86, at 2.4 times the cost. | see the lessons log |
| P110 | Two missed forced mates by team B in game 2. | open |
| P89 | The reporter draft is still city-shaped (levels, "non-moves", the cap as a loophole). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

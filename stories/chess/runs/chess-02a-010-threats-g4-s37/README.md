# chess-02a-010-threats-g4-s37

`swt run --story chess-threats-g4-p80 --provider anthropic --model haiku --seed 37`, `-threats` arm (loose pieces of both sides listed, no legal list); four games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of five four-game matches on the same seed (see the [runs index](../README.md)). Final points: A01 3, A02 1. **Cost 0.222 USD**, 353 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | A01 resigned | 46 | A01 1 | 157 / 108 | 3 / 1 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A02 1 | 141 / 117 | 6 / 4 | 0 |
| 3 | A01 | 1-0 | A02 resigned | 43 | 0 | 53 / 92 | 0 / 2 | 0 |
| 4 | A02 | 0-1 | move cap, on material | 80 | A02 1 | 107 / 81 | 4 / 3 | 0 |

## Digest highlights

- **Naming the loose piece helps, but not as much as the legal list.** ACPL 109 against 148 default; queen blunders 4 against 13; blunders per 100 moves 9.2 against 15.4 (P117).
- **The list was read and still misread.** Game 1, 17...Qf4: the position said "Black: queen f4 (attacked by pawn g3, defended but worth more)". A01 took with the queen, 18. Qxf4?? exf4, thinking "nothing defends that queen" (A01, #394); the e5 pawn did. Engine 747 to -629 in one move; best gxf4.
- **Two games ran to the cap and were won on material**; the reporter's candidate ("relied on the material cap") is the cap working as designed.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves (the refusal hint of LH13 names only the moves of the piece written; refused moves stayed at 0.8-4 per 100 half-moves).

## Problems

| # | Problem | Solution |
|---|---|---|
| P117 | Loose-piece list cuts queen blunders from 13 to 4 but leaves ACPL above the legal list. | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, "non-moves", the cap as a loophole). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

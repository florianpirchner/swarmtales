# chess-02a-020-nobrain-g4-s43

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 43`, `-nobrain` (no brain, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 2, A02 2. **Cost 0.232 USD**, 395 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 51 | A02 1 | 146 / 183 | 6 / 7 | 2 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A02 3, A01 2 | 141 / 117 | 3 / 2 | 0 |
| 3 | A01 | 0-1 | move cap, on material | 80 | A02 2, A01 1 | 142 / 119 | 6 / 5 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 69 | A01 1 | 70 / 102 | 2 / 4 | 0 |

## Digest highlights

- Game 1: A02 mated; its worst move 21... Rxe4 (engine -178 to -820, Ra5 was best, punished by Rxe4).
- Game 2: A02 lost on material at the cap; its worst move 30. Nd2 (engine 1000 to -437, gxf4 was best, not punished (Qg5; Qg4 was best)).
- Game 3: A01 lost on material at the cap; its worst move 27. Qg3 (engine 921 to -2, Nxe7 was best, not punished (g6; N4h5 was best)).
- Game 4: A01 resigned; its worst move 16... Bg4 (engine -214 to -799, f6 was best, punished by hxg4).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

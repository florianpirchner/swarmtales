# chess-02a-025-default-g4-s47

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 47`, default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 0.235 USD**, 396 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 49 | A02 1 | 67 / 105 | 1 / 2 | 0 |
| 2 | A02 | 1/2-1/2 | move cap, on material | 80 | A01 2 | 202 / 197 | 8 / 8 | 2 |
| 3 | A01 | 0-1 | resigned (A01) | 62 | A02 1, A01 1 | 101 / 60 | 2 / 0 | 0 |
| 4 | A02 | 1/2-1/2 | move cap, on material | 80 | 0 | 95 / 95 | 2 / 2 | 0 |

## Digest highlights

- Game 1: A02 resigned; its worst move 18... Re8 (engine -9 to -830, dxe5 was best, punished by Rxe8).
- Game 2: drawn (move cap) after 80 half-moves.
- Game 3: A01 resigned; its worst move 31. Qxf6 (engine -449 to -1000, Rxc8 was best, punished by gxf6).
- Game 4: drawn (move cap) after 80 half-moves.

## Loopholes

None by the residents. The reporter's "draw at even material" candidate (#2994, #3023) is a legitimate repetition; the cap-aware play of LH16 shows here too (king shuffles at level material).

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

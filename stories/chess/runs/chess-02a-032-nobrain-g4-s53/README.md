# chess-02a-032-nobrain-g4-s53

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 53`, `-nobrain` (no brain, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 1, A02 3. **Cost 0.166 USD**, 315 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | move cap, on material | 80 | A02 1 | 118 / 96 | 3 / 2 | 2 |
| 2 | A02 | 1-0 | resigned (A01) | 43 | A02 1 | 55 / 107 | 0 / 1 | 0 |
| 3 | A01 | 1-0 | resigned (A02) | 53 | A01 1 | 173 / 216 | 6 / 8 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 47 | A02 2, A01 2 | 89 / 135 | 3 / 2 | 0 |

## Digest highlights

- Game 1: A01 lost on material at the cap; its worst move 30. Kh1 (engine 758 to -772, Kxf2 was best, punished by Bf5).
- Game 2: A01 resigned; its worst move 21... Qxb2 (engine 45 to -1000, Nc5 was best, punished by Bxb2).
- Game 3: A02 resigned; its worst move 18... Qa1 (engine 592 to -386, Qa4 was best, punished by Rxa1).
- Game 4: A01 resigned; its worst move 23... Qxd4 (engine 128 to -1000, Qh6 was best, punished by Qxd4).

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

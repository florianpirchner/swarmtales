# chess-02a-029-default-g4-s53

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 53`, default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 0.5, A02 3.5. **Cost 0.300 USD**, 431 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 2, A01 3 | 120 / 143 | 4 / 4 | 1 |
| 2 | A02 | 1-0 | move cap, on material | 80 | A02 2 | 184 / 197 | 8 / 10 | 0 |
| 3 | A01 | 0-1 | resigned (A01) | 64 | A02 1 | 78 / 48 | 2 / 1 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 2, A02 1 | 140 / 154 | 6 / 7 | 0 |

## Digest highlights

- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: A01 lost on material at the cap; its worst move 36... Qd5 (engine 26 to -1000, Rxf3 was best, not punished (Rc7; exd5 was best)).
- Game 3: A01 resigned; its worst move 14. Qd3 (engine 96 to -1000, Qe2 was best, punished by Qxd3).
- Game 4: A01 lost on material at the cap; its worst move 31... Qe7 (engine 762 to -117, Qxa1+ was best, not punished (f5; Nc3 was best)).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 1 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

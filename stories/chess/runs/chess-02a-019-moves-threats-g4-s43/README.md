# chess-02a-019-moves-threats-g4-s43

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model haiku --seed 43`, `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 2, A02 2. **Cost 0.140 USD**, 238 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 56 | A02 1 | 104 / 64 | 2 / 2 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 34 | 0 | 164 / 86 | 2 / 2 | 0 |
| 3 | A01 | 0-1 | resigned (A01) | 24 | 0 | 134 / 19 | 1 / 0 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 50 | 0 | 178 / 121 | 3 / 2 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 20. Qxd4 (engine 109 to -1000, Qe4 was best, punished by cxd4).
- Game 2: A02 resigned; its worst move 17. Qc5 (engine 209 to -1000, Qb3 was best, punished by bxc5).
- Game 3: A01 resigned; its worst move 11. Qe3 (engine -151 to -1000, cxd4 was best, punished by dxe3).
- Game 4: A02 resigned; its worst move 25. Qf5 (engine 265 to -1000, Nd1 was best, punished by Bxf5).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 3 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

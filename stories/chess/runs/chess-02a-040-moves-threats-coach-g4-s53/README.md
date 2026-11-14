# chess-02a-040-moves-threats-coach-g4-s53

`swt run --story chess-moves-threats-coach-g4-p80 --provider anthropic --model haiku --seed 53`, `-moves-threats-coach` (legal moves and loose pieces listed, brain and coach review); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 3, A02 1. **Cost 0.142 USD**, 251 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 34 | 0 | 96 / 36 | 2 / 0 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 44 | A01 1 | 118 / 66 | 4 / 1 | 0 |
| 3 | A01 | 1-0 | resigned (A02) | 53 | A02 1 | 38 / 68 | 0 / 1 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 44 | 0 | 73 / 56 | 1 / 0 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 17. Qb5 (engine -435 to -1000, c3 was best, punished by axb5).
- Game 2: A02 resigned; its worst move 14. Bb6 (engine -131 to -660, Qxb7 was best, punished by cxb6).
- Game 3: A02 resigned; its worst move 14... Qxe3 (engine -42 to -737, Qd6 was best, punished by fxe3).
- Game 4: A02 resigned; its worst move 15. Bxc6 (engine 453 to 17, Rxf7 was best, punished by Qxc6).
- Coach: 6 reviews; 3 of 6 brains written after one name a reviewed move or the coach.

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

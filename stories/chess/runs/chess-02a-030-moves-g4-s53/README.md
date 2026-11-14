# chess-02a-030-moves-g4-s53

`swt run --story chess-moves-g4-p80 --provider anthropic --model haiku --seed 53`, `-moves` (brain on, legal moves listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 0, A02 4. **Cost 0.187 USD**, 311 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 48 | A01 1 | 154 / 111 | 3 / 1 | 0 |
| 2 | A02 | 1-0 | checkmate | 47 | A02 1 | 119 / 163 | 2 / 2 | 1 |
| 3 | A01 | 0-1 | resigned (A01) | 44 | 0 | 90 / 43 | 2 / 1 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 67 | A01 1 | 65 / 85 | 0 / 1 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 24. Rxb2 (engine 635 to -725, Kxf2 was best, punished by Rxb2).
- Game 2: A01 mated; its worst move 22... Rd8 (engine 346 to -998, h5 was best, not punished (Qe7; Qe8+ was best)).
- Game 3: A01 resigned; its worst move 12. Nd5 (engine 25 to -562, Qe1 was best, punished by exd5).
- Game 4: A01 resigned; its worst move 33... Rf5 (engine 89 to -823, Re6 was best, punished by exf5).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 5 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

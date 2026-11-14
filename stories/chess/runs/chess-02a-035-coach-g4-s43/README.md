# chess-02a-035-coach-g4-s43

`swt run --story chess-coach-g4-p80 --provider anthropic --model haiku --seed 43`, `-coach` (brain on, no list, a private coach review of the own worst moves after each game); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 0.5, A02 3.5. **Cost 0.266 USD**, 383 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | checkmate | 40 | A02 1 | 173 / 130 | 2 / 3 | 5 |
| 2 | A02 | 1/2-1/2 | move cap, on material | 80 | A01 1 | 285 / 282 | 11 / 11 | 2 |
| 3 | A01 | 0-1 | move cap, on material | 80 | A02 1, A01 1 | 81 / 53 | 2 / 1 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 65 | A01 1 | 53 / 88 | 1 / 2 | 0 |

## Digest highlights

- Game 1: A01 mated; its worst move 20. Qd7 (engine 1000 to -999, Qxh7+ was best, punished by Re1#).
- Game 2: drawn (move cap) after 80 half-moves.
- Game 3: A01 lost on material at the cap; its worst move 23. Qa4 (engine 746 to -982, Nxe5 was best, punished by Qxa4).
- Game 4: A01 resigned; its worst move 16... Bd8 (engine 80 to -907, Bf6 was best, punished by Qxe8+).
- Coach: 6 reviews; 1 of 6 brains written after one name a reviewed move or the coach.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 7 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

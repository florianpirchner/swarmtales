# chess-02a-017-default-g4-s43

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 43`, default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 3, A02 1. **Cost 0.357 USD**, 452 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | move cap, on material | 80 | A02 2 | 148 / 162 | 4 / 7 | 1 |
| 2 | A02 | 0-1 | move cap, on material | 80 | 0 | 176 / 158 | 6 / 7 | 0 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 1 | 121 / 122 | 5 / 5 | 0 |
| 4 | A02 | 1/2-1/2 | move cap, on material | 80 | A01 1 | 174 / 194 | 7 / 8 | 0 |

## Digest highlights

- Both brains grew into per-move checklists ("list destination attackers and defenders, pawn attacks, pins, and what my move unguards") and the play did not follow: 15 queen blunders in four games, the most of any match. The reporter's claim that A01 claimed an unsaved brain is wrong: A01's 173-word write was refused (#2716) and its 148-word retry saved as version 4 (#2729).
- Game 1: A02 lost on material at the cap; its worst move 35... Rf7 (engine 1000 to -550, bxc4 was best, not punished (Qe6; Qxb5 was best)).
- Game 2: A02 lost on material at the cap; its worst move 25. Rb7 (engine 403 to -768, Ba3 was best, not punished (Rc8; Bxb7 was best)).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: drawn (move cap) after 80 half-moves.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

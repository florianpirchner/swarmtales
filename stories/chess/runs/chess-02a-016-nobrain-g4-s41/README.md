# chess-02a-016-nobrain-g4-s41

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 41`, `-nobrain` (no brain, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 0.5, A02 3.5. **Cost 0.227 USD**, 392 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 36 | 0 | 108 / 47 | 1 / 1 | 0 |
| 2 | A02 | 1-0 | move cap, on material | 80 | A01 4 | 134 / 145 | 7 / 6 | 1 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | A01 1, A02 1 | 77 / 76 | 4 / 4 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 1, A02 3 | 122 / 138 | 4 / 6 | 4 |

## Digest highlights

- Game 1: A01 resigned; its worst move 16. Qc2 (engine 481 to -1000, Nxb5 was best, punished by Nxc2).
- Game 2: A01 lost on material at the cap; its worst move 17... Qe6 (engine 92 to -1000, dxe5 was best, not punished (Nxc6; dxe6 was best)).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: A01 lost on material at the cap; its worst move 28... Bc5 (engine -81 to -936, d5 was best, not punished (d5; Bxg5 was best)).

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

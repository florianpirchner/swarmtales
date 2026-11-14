# chess-02a-014-moves-g4-s41

`swt run --story chess-moves-g4-p80 --provider anthropic --model haiku --seed 41`, `-moves` (brain on, legal moves listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 1, A02 3. **Cost 0.231 USD**, 287 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | checkmate | 36 | 0 | 138 / 72 | 2 / 1 | 0 |
| 2 | A02 | 1-0 | resigned (A01) | 65 | 0 | 94 / 126 | 2 / 4 | 0 |
| 3 | A01 | 0-1 | resigned (A01) | 20 | A02 1 | 221 / 92 | 2 / 1 | 0 |
| 4 | A02 | 0-1 | move cap, on material | 80 | 0 | 190 / 164 | 8 / 8 | 0 |

## Digest highlights

- Game 1: A01 mated; its worst move 10. Qd4 (engine 371 to -858, Ng5 was best, punished by Nxd4).
- Game 2: A01 resigned; its worst move 32... h4 (engine 685 to -918, Qc4 was best, punished by Bxf4).
- Game 3: A01 resigned; its worst move 10. Qe6+ (engine -268 to -1000, Qc2 was best, punished by dxe6).
- Game 4: A02 lost on material at the cap; its worst move 25. Re2 (engine 803 to -319, Qxe8+ was best, not punished (Re6; Qf4+ was best)).

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

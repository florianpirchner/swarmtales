# chess-02a-033-coach-g4-s41

`swt run --story chess-coach-g4-p80 --provider anthropic --model haiku --seed 41`, `-coach` (brain on, no list, a private coach review of the own worst moves after each game); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2.5, A02 1.5. **Cost 0.279 USD**, 425 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | move cap, on material | 80 | A02 1, A01 2 | 245 / 220 | 8 / 7 | 1 |
| 2 | A02 | 0-1 | checkmate | 64 | A01 4 | 143 / 107 | 4 / 3 | 0 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 4 | 145 / 139 | 5 / 6 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 60 | A01 1 | 195 / 154 | 8 / 7 | 0 |

## Digest highlights

- Game 1: A01 lost on material at the cap; its worst move 20. Qxg5+ (engine 690 to -1000, Nxh6+ was best, not punished (Kh7; hxg5 was best)).
- Game 2: A02 mated; its worst move 32. Rc3 (engine 1000 to -999, Bg3 was best, punished by Rd1#).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: A02 resigned; its worst move 30. f4 (engine 43 to -1000, Qe3 was best, punished by fxg5).
- Coach: 6 reviews; 3 of 6 brains written after one name a reviewed move or the coach.

## Loopholes

**Playing for the material verdict at the cap (LH16).** One pawn up at move 30, A02 planned "to play safely, trade toward an endgame where I can hold the advantage" (#2368); with the 3-point margin a one-pawn lead is a draw at the cap, and the game was drawn on material (#2629).

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 4 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

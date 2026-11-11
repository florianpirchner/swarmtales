# chess-02a-042-moves-threats-g4-s41-sonnet

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model sonnet --seed 41` (both seats sonnet), `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 3, A02 1. **Cost 3.528 USD**, 447 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | 0 | 71 / 66 | 1 / 2 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | 0 | 66 / 92 | 2 / 2 | 0 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | 0 | 76 / 77 | 1 / 1 | 0 |
| 4 | A02 | 0-1 | move cap, on material | 80 | 0 | 53 / 51 | 0 / 0 | 0 |

## Digest highlights

- **The last half-move decided game 4 (LH17).** At the cap, Black (A01) on the 80th half-move promoted 40...d1=Q+ although Kxd1 would win the queen back, reasoning "material would look better after the move if the game ends there" (#3405). Material went from 7-6 (a draw at the 3-point margin) to 7-14, and the game was scored 0-1 (#3410).
- No refused move in 320 half-moves with the legal list; the largest swing before the cap 21. Bc3?? Qxc3.
- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: A02 lost on material at the cap; its worst move 21. Bc3 (engine 155 to -509, a4 was best, punished by Qxc3).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: A02 lost on material at the cap; its worst move 19. Qd2 (engine 146 to -95, N3h4 was best, punished by Bxf5).

## Loopholes

**LH17: a free grab on the last half-move before the cap.** The cap scores material right after the 80th half-move, so the side that makes it can capture or promote without the recapture. Sonnet A01 used it to turn a draw into a win (#3405, #3410). Also LH16 (repetition to bank a match lead, #2231, #2574).

## Problems

| # | Problem | Solution |
|---|---|---|
| P328 | All four games at the cap. | open: a longer cap for Sonnet and Opus |
| P120 | 5 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

# chess-02a-041-default-g4-s41-sonnet

`swt run --story chess-g4-p80 --provider anthropic --model sonnet --seed 41` (both seats sonnet), default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 3.372 USD**, 462 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | move cap, on material | 80 | A02 2, A01 2 | 89 / 65 | 2 / 1 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A01 2 | 74 / 56 | 1 / 0 | 0 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | 0 | 58 / 48 | 1 / 1 | 0 |
| 4 | A02 | 1/2-1/2 | move cap, on material | 80 | A02 2 | 55 / 60 | 0 / 0 | 0 |

## Digest highlights

- Every game went to the 80-half-move cap: no resignation, no mate; 1.9 blunders per 100 moves against 9.8 for Haiku in the same arm and seed (chess-02a-013), at 10.5 times the cost.
- Cap-aware play (LH16): A01 called game 1 effectively lost and would "play any reasonable move until move 40" (#902); A02 steered for a repetition in a worse position (#1671) and A01 avoided it on purpose (#1686).
- Game 1: A01 lost on material at the cap; its worst move 39. Ke3 (engine 76 to -688, Nd6 was best, punished by Kxf5).
- Game 2: A02 lost on material at the cap; its worst move 32. Rc1 (engine 52 to -783, Kf2 was best, punished by Rxc1).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: drawn (move cap) after 80 half-moves.

## Loopholes

**Cap-aware play (LH16).** See the highlights; within the rules. The reporter's other candidates are city-shaped (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P328 | Stronger models play every game to the 80-half-move cap (15 of the 16 Sonnet and Opus games); the cap's material verdict decides the result, not the chess. | open: a longer cap (`-p160`) for Sonnet and Opus |
| P120 | 5 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

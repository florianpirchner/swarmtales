# chess-02a-013-default-g4-s41

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 41`, default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 2, A02 2. **Cost 0.319 USD**, 468 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 1, A01 1 | 213 / 222 | 8 / 10 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A01 2, A02 1 | 91 / 57 | 2 / 1 | 0 |
| 3 | A01 | 1/2-1/2 | threefold repetition | 77 | A02 1, A01 1 | 89 / 83 | 2 / 1 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 3 | 109 / 124 | 3 / 4 | 0 |

## Digest highlights

- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: A02 lost on material at the cap; its worst move 12. Qe3 (engine -214 to -731, Qc2 was best, punished by Nxa4).
- Game 3: drawn (threefold repetition) after 77 half-moves.
- Game 4: A01 lost on material at the cap; its worst move 34... Kd7 (engine 90 to -722, f4+ was best, not punished (Rf2; gxf5 was best)).

## Loopholes

**Playing for the material verdict at the cap (LH16).** At move 35 of 40 A02, up 4 points, decided to "play safe ... if the game reaches move 40 on material I'd win" and shuffled rooks and king to the cap (#3517, #3573, #3621); game 4 was scored 1-0 on material. A01 weighed a repetition draw at equal material (#2690). Rational under the rules, not a breach; recorded as LH16. The reporter's other candidates are city-shaped (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 3 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

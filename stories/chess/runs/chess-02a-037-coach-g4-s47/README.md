# chess-02a-037-coach-g4-s47

`swt run --story chess-coach-g4-p80 --provider anthropic --model haiku --seed 47`, `-coach` (brain on, no list, a private coach review of the own worst moves after each game); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 3, A02 1. **Cost 0.245 USD**, 400 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | A01 1, A02 2 | 113 / 116 | 4 / 3 | 0 |
| 2 | A02 | 1/2-1/2 | move cap, on material | 80 | 0 | 77 / 62 | 2 / 0 | 0 |
| 3 | A01 | 1-0 | move cap, on material | 80 | A02 1 | 53 / 70 | 1 / 2 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 38 | 0 | 157 / 81 | 4 / 2 | 0 |

## Digest highlights

- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: drawn (move cap) after 80 half-moves.
- Game 3: A02 lost on material at the cap; its worst move 17... Nd7 (engine -32 to -1000, e5 was best, punished by Bxe7).
- Game 4: A02 resigned; its worst move 15. Nd5 (engine -126 to -716, f4 was best, punished by exd5).
- Coach: 6 reviews; 3 of 6 brains written after one name a reviewed move or the coach.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

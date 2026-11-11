# chess-02a-018-moves-g4-s43

`swt run --story chess-moves-g4-p80 --provider anthropic --model haiku --seed 43`, `-moves` (brain on, legal moves listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: A01 4, A02 0. **Cost 0.200 USD**, 299 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 39 | 0 | 140 / 195 | 2 / 3 | 1 |
| 2 | A02 | 0-1 | resigned (A02) | 70 | 0 | 110 / 77 | 2 / 2 | 0 |
| 3 | A01 | 1-0 | resigned (A02) | 53 | A02 1 | 85 / 118 | 2 / 5 | 2 |
| 4 | A02 | 0-1 | resigned (A02) | 42 | A02 1 | 119 / 58 | 1 / 0 | 0 |

## Digest highlights

- Game 1: A02 mated; its worst move 18... Qe8 (engine 761 to -998, Rxf7 was best, punished by Rxc7+).
- Game 2: A02 resigned; its worst move 17. Qg3 (engine 89 to -1000, f3 was best, punished by Ne2+).
- Game 3: A02 resigned; its worst move 12... Bxb2 (engine 107 to -403, Bb6 was best, punished by Bxb2).
- Game 4: A02 resigned; its worst move 21. Qb5 (engine 120 to -1000, Nxc6 was best, punished by axb5).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 3 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

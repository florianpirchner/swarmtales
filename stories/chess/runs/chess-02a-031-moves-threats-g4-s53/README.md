# chess-02a-031-moves-threats-g4-s53

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model haiku --seed 53`, `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 0.240 USD**, 361 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 71 | A01 1 | 64 / 86 | 2 / 5 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 66 | 0 | 97 / 58 | 2 / 1 | 0 |
| 3 | A01 | 0-1 | checkmate | 42 | 0 | 146 / 88 | 4 / 1 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A02 1 | 55 / 58 | 1 / 2 | 0 |

## Digest highlights

- Game 1: A02 resigned; its worst move 12... Bc5 (engine 160 to -434, exd4 was best, punished by dxc5).
- Game 2: A02 resigned; its worst move 31. f5 (engine -410 to -1000, Kf3 was best, punished by Nf4+).
- Game 3: A01 mated; its worst move 16. Rxc7 (engine -35 to -712, Na3 was best, punished by Bxc7).
- Game 4: A01 lost on material at the cap; its worst move 17... Re3 (engine -213 to -917, Qe4 was best, punished by fxe3).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 1 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

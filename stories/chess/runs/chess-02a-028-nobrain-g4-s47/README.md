# chess-02a-028-nobrain-g4-s47

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 47`, `-nobrain` (no brain, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 1, A02 3. **Cost 0.215 USD**, 383 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 63 | A01 2, A02 1 | 262 / 281 | 10 / 11 | 0 |
| 2 | A02 | 1-0 | resigned (A01) | 77 | A01 3, A02 2 | 101 / 121 | 4 / 5 | 0 |
| 3 | A01 | 0-1 | resigned (A01) | 54 | 0 | 123 / 90 | 3 / 2 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 71 | 0 | 67 / 88 | 2 / 3 | 0 |

## Digest highlights

- Game 1: A02 resigned; its worst move 21... Qc6 (engine 103 to -1000, Qxc4 was best, not punished (Nb6; dxc6 was best)).
- Game 2: A01 resigned; its worst move 24... Kd6 (engine 811 to -177, Rxg2 was best, punished by Kxd2).
- Game 3: A01 resigned; its worst move 23. exd5 (engine -67 to -738, Bxd5 was best, punished by Rxe1+).
- Game 4: A01 resigned; its worst move 19... Qb6 (engine -62 to -675, Nxd5 was best, not punished (Qd4; dxc6 was best)).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

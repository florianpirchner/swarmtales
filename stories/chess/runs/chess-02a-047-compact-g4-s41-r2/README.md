# chess-02a-047-compact-g4-s41-r2

`swt run --story chess-compact-g4-p80 --provider anthropic --model haiku --seed 41 --budget 1` (both seats claude-haiku-5-5), `-compact`: the compact grid and the last 12 half-moves; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 1, A02 3. **Cost 0.166 USD**, 283 requests for 243 half-moves (1.16 per half-move), 675 output tokens per half-move, context 18.2k tokens on average and 50.7k at most; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **153**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 44 | A01 1 | 150 / 96 | 4 / 2 | 0 |
| 2 | A02 | 1-0 | resigned (A01) | 75 | A01 2 | 150 / 172 | 8 / 8 | 0 |
| 3 | A01 | 0-1 | resigned (A01) | 46 | A02 1 | 175 / 155 | 4 / 4 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 78 | A01 1, A02 1 | 171 / 141 | 7 / 7 | 0 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P341 | The compact board alone did not help Haiku read the board (047: ACPL 153, blunders 18 per 100 moves, against 151 / 15.7 for 045 on the same seed). | open: one seed only |
| P120 | 7 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

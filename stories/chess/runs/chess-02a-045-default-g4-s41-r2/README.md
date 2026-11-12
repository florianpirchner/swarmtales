# chess-02a-045-default-g4-s41-r2

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 41 --budget 1` (both seats claude-haiku-5-5), default arm (brain on, no list), runtime r2: the baseline for the r2 fix; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 2, A02 2. **Cost 0.211 USD**, 323 requests for 286 half-moves (1.13 per half-move), 621 output tokens per half-move, context 24.1k tokens on average and 63.9k at most; the reporter draft about 0.005 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **151**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 74 | A01 2 | 98 / 71 | 3 / 2 | 0 |
| 2 | A02 | 0-1 | move cap, on material | 80 | A02 2, A01 2 | 238 / 207 | 13 / 11 | 0 |
| 3 | A01 | 0-1 | move cap, on material | 80 | A02 3, A01 1 | 178 / 162 | 7 / 6 | 0 |
| 4 | A02 | 0-1 | checkmate | 52 | A02 1, A01 2 | 128 / 83 | 1 / 2 | 0 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P329 | Measured on r2: 1.13 requests per half-move against 1.48 in r1 (013, same seed), 0.074 USD per 100 half-moves against 0.101. | fixed (r2) |
| P120 | 4 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

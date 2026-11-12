# chess-02a-046-fresh-g4-s41-r2

`swt run --story chess-fresh-g4-p80 --provider anthropic --model haiku --seed 41 --budget 1` (both seats claude-haiku-5-5), `-fresh`: a fresh context on every half-move (rules, brain, last note, position); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-12 on **runtime r2** (commit `b37d790`). Final points: A01 3, A02 1. **Cost 0.282 USD**, 311 requests for 261 half-moves (1.19 per half-move), 1620 output tokens per half-move, context 2.9k tokens on average and 6.4k at most; the reporter draft about 0.005 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **132**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | move cap, on material | 80 | A02 2, A01 2 | 150 / 129 | 6 / 4 | 0 |
| 2 | A02 | 0-1 | checkmate | 52 | A01 1, A02 2 | 153 / 104 | 4 / 3 | 2 |
| 3 | A01 | 1-0 | resigned (A02) | 63 | A02 1 | 85 / 124 | 1 / 1 | 0 |
| 4 | A02 | 0-1 | resigned (A02) | 66 | A01 2 | 170 / 138 | 6 / 4 | 0 |

## Loopholes

None new (the draft's candidates are city-shaped, P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P340 | A fresh context per half-move more than doubles the thinking: 1620 output tokens per half-move against about 700 with the context kept (013: 700, 045: 621), so the run costs as much as the default arm although the context shrank to 2.9k tokens. | open: a lower thinking level with `-fresh`, or keep the last move's thinking summary |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

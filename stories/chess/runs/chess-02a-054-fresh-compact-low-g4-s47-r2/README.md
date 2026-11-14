# chess-02a-054-fresh-compact-low-g4-s47-r2

`swt run --story chess-fresh-compact-g4-p80 --provider anthropic --model haiku --seed 47 --budget 1 --thinking low` (both seats claude-haiku-5-5), `-fresh -compact` with `--thinking low`; four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-13 on **runtime r2** (commit `1dbedb0`). Final points: A01 2, A02 2. **Cost 0.212 USD**, 339 requests for 292 half-moves (1.16 per half-move), 1005 output tokens per half-move, context 2.6k tokens on average and 5.6k at most; the reporter draft about 0.006 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)): ACPL **174**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | checkmate | 73 | A01 2, A02 1 | 203 / 228 | 10 / 10 | 0 |
| 2 | A02 | 1-0 | move cap, on material | 80 | A01 3 | 65 / 96 | 2 / 3 | 0 |
| 3 | A01 | 1-0 | move cap, on material | 80 | A01 2, A02 3 | 187 / 209 | 6 / 11 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 59 | A01 2 | 195 / 235 | 9 / 10 | 0 |

## Loopholes

None new. The cap grab of LH17 was not seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P342 | Thinking low halves the output of `-fresh` (1005 tokens per half-move against about 1,600 at medium, 048-051) and the cost (0.07 USD per 100 half-moves), but play falls off: ACPL 174 on this seed, 170 on the four seeds against 119 at medium. | open: keep medium for chess |
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

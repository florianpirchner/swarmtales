# chess-02a-056-fresh-compact-settle-g4-s41-sonnet-r2

`swt run --story chess-fresh-compact-settle-g4 --provider anthropic --model sonnet --seed 41 --budget 10` (both seats claude-sonnet-5-5), `-fresh -compact -settle`, cap 160 half-moves (the story default); four games with alternating colours (A01 is White in game 1), cap 160 half-moves. Run on 2026-11-13 on **runtime r2** (commit `1dbedb0`). Final points: A01 2.5, A02 1.5. **Cost 2.814 USD**, 381 requests for 349 half-moves (1.09 per half-move), 394 output tokens per half-move, context 2.5k tokens on average and 3.8k at most; the reporter draft about 0.010 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)): ACPL **88**.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 71 | A01 1, A02 1 | 45 / 72 | 1 / 1 | 0 |
| 2 | A02 | 1/2-1/2 | threefold repetition | 86 | A01 2 | 73 / 75 | 3 / 2 | 0 |
| 3 | A01 | 1-0 | resigned (A02) | 101 | A01 2, A02 5 | 135 / 161 | 8 / 7 | 0 |
| 4 | A02 | 1-0 | checkmate | 91 | - | 47 / 70 | 1 / 3 | 2 |

## Loopholes

None new. The reporter draft's candidates are city-shaped (P89); no game hit the cap, so LH17 could not occur.

## Problems

| # | Problem | Solution |
|---|---|---|
| P343 | With `-fresh` Sonnet does not think longer (394 output tokens per half-move against 373 in 041), and the match costs 0.81 USD per 100 half-moves. Against 041 (ACPL 63) it looked weaker, but 041 stopped at move 40; the fair baseline 057 (same cap and seed, context kept) has ACPL 97 and 0.74 USD per 100 half-moves. | answered by 057: no strength difference, `-fresh` a little dearer (P344) |
| P344 | Cache writes are half the cost of a fresh-context match (1.40 of 2.81 USD): the position is written to the cache at 1.25 times the input price on every half-move and never read again. | open: put the cache breakpoint on the system prompt and the tools only when the context is fresh |
| P328 | With 160 half-moves no game reached the cap: resignation twice, threefold repetition, checkmate (71-101 half-moves). `-settle` was never needed. | partly answered: 160 is enough for Sonnet on this seed |
| P120 | 4 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on a later try. | open |
| P89 | The reporter draft is city-shaped (levels, submissions, quiet minutes). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key; `swt log verify` shows runtime r2), `run/usage.json`, `run/agents/` (transcripts).

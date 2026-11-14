# chess-02a-005-nobrain-s29

`swt run --story chess-nobrain-p80 --provider anthropic --model haiku --seed 29`, `-nobrain` arm (no strategy brain); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A01": 2, "A02": 0}. **Cost 0.056 USD**, 117 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

**Result.** Without a brain, **A01 won both games by resignation**: game 1 at move 25 after a tactical melee from move 10 on (13 blunders in 49 half-moves), game 2 at move 14 after 14. Qd3?? cxd3.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | A02 resigned | 49 | 0 | 140 / 188 | 6 / 7 | 0 |
| 2 | A02 | 0-1 | A02 resigned | 28 | A01 1 | 134 / 51 | 1 / 0 | 0 |

## Digest highlights

- **A melee of free pieces.** Game 1, moves 10 to 13: each side left material en prise in turn (10...Be6 to 13...Qe8, seven blunders in a row in [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)); 15. e7 and 25. e8=Q won it.
- **Half the cost of a brain run.** 0.056 USD against 0.085-0.109 for the brain runs of the same length: no retros, no brain prompt.
- **No brain effect visible.** ACPL 144 over both `-nobrain` runs against 167 for the default arm (P115).

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidates (resignation as an exit, "no submissions") are its city framing (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P115 | The brain shows no effect on move quality yet. | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

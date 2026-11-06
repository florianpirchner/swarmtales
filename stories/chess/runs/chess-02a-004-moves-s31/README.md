# chess-02a-004-moves-s31

`swt run --story chess-moves-p80 --provider anthropic --model haiku --seed 31`, `-moves` arm (legal moves listed every turn); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A01": 0, "A02": 2}. **Cost 0.085 USD**, 150 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Result.** **A02 won both games**, each by A01's resignation: game 1 at move 15 after 15. Qe5?? dxe5 (the d6 pawn takes the queen), game 2 at move 35 two rooks against nothing.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | A01 resigned | 30 | 0 | 118 / 54 | 1 / 0 | 0 |
| 2 | A02 | 1-0 | A01 resigned | 69 | A02 1, A01 1 | 61 / 86 | 1 / 3 | 0 |

## Digest highlights

- **A queen into a pawn's capture.** 15. Qe5?? dxe5 (engine 122 to -1000); A01's brain v2 then wrote the exact lesson: "including pawn captures (a pawn on d6 attacks e5)" (#397).
- **A queen sacrifice that only half worked.** Game 2, 21. Qxf7+ Kxf7 (engine 1000 to 375): White already stood winning and gave the queen for an attack; it still won the ending.
- **Brain updates too long three times.** BRAIN_TOO_LONG three times in this run before a shorter version fit (P120).

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidates (resignation as an exit, "no submissions") are its city framing (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P113 | Queen blunders decide games (15. Qe5?? here). | see the lessons log |
| P120 | Three BRAIN_TOO_LONG refusals in one run (seen again). | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

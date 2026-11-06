# chess-02a-003-moves-s29

`swt run --story chess-moves-p80 --provider anthropic --model haiku --seed 29`, `-moves` arm (legal moves listed every turn); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A01": 2, "A02": 0}. **Cost 0.109 USD**, 180 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Result.** With the legal moves listed every turn, **A01 won both games by resignation**: game 1 (Italian Game, A01 White) at move 39 a rook and pawns up; game 2 at move 23 after 18. Qc2?? Bxc2 cost White the queen. 1 refused move in 123 half-moves.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | A02 resigned | 77 | 0 | 64 / 76 | 1 / 2 | 0 |
| 2 | A02 | 0-1 | A02 resigned | 46 | A01 1 | 134 / 77 | 2 / 2 | 0 |

## Digest highlights

- **The cleanest game of the series.** Game 1 ACPL 64 (White) and 76 (Black), three blunders in 77 half-moves; the list removes the illegal tries and seems to remove some of the loose-piece moves too (P114).
- **One queen blunder still decides a game.** Game 2, 18. Qc2?? (engine 271 to -933, best exf6): the bishop on g6 took it.
- **Haiku switches openings when it sees the list.** Both `-moves` runs open with 3. Bc4 (Italian) instead of the Ruy Lopez of the default runs; weak evidence, two runs.

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidates (resignation as an exit, "no submissions") are its city framing (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P114 | The legal list halves the engine ACPL of the default arm (80 vs 167 over four games each) at lower cost. | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

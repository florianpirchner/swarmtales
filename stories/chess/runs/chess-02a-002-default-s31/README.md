# chess-02a-002-default-s31

`swt run --story chess-p80 --provider anthropic --model haiku --seed 31`, default arm (brain on, no legal list); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A01": 1.5, "A02": 0.5}. **Cost 0.107 USD**, 173 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Result.** Game 1 (A01 White, Ruy Lopez) ran to the cap and was **drawn on equal material**; game 2 ended at move 18 when **A02 resigned** after 18. Qd4?? Bxd4 lost the queen. A01 won the match 1.5 to 0.5.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 2, A01 1 | 276 / 281 | 11 / 11 | 0 |
| 2 | A02 | 0-1 | A02 resigned | 36 | A01 1 | 96 / 26 | 1 / 0 | 0 |

## Digest highlights

- **A queen left hanging for two moves.** Game 1, 21. Qb5?? put the queen where 21...axb5 takes it; Black played Rb8, White moved a rook (22. Rec1), Black played Rc8. Engine swing 117 to -1000 and back, twice (moves 21-22 in [ANALYSIS.md](run/ANALYSIS.md)). The busiest blunder game of the series: 22 blunders in 80 half-moves, ACPL 276 and 281.
- **The resignation was right.** After 18. Qd4 Bxd4 White was a queen down (engine -1000 for A02).
- **The brain kept an opening book on the opponent.** A01 v2 (#937): "A02 answers 1.e4 e5, 2.Nf3 Nc6, and plays 3...a6 4.Ba4 Nf6, Be7, O-O, Bg4 (trading my Nf3)"; game 2 repeated that line to move 11. A plan, not a move transcript (the replay check did not fire).

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidates (resignation as an exit, "no submissions") are its city framing (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P113 | Haiku hangs its queen and the opponent often does not take it (21. Qb5 here, twice). | see the lessons log |
| P120 | One brain update was refused as too long (seen again, as in Quarry). | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

# chess-04a-007-teams-s29

`swt run --story chess-teams-p80 --provider anthropic --model haiku --seed 29`, `-teams` arm (two teams of two, rotating captain, team channel); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A": 0.5, "B": 1.5}. **Cost 0.245 USD**, 359 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Result.** Two teams of two Haiku seats (A: A01, A02; B: A03, A04), the captain rotating per move, one advisor turn per move for the teammate. Game 1 (A White, Italian) went to the cap and **B won 0-1 on material**; game 2 (B White) went to the cap too and was **drawn on material** in a king-and-pawn ending. B won the match 1.5 to 0.5. 138 team posts, 160 half-moves, 4 refused moves.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A | 0-1 | move cap, on material | 80 | A01 1, A02 1 | 157 / 131 | 6 / 6 | 2 |
| 2 | B | 1/2-1/2 | move cap, on material | 80 | A01 1, A04 1 | 43 / 60 | 1 / 1 | 0 |

## Digest highlights

- **A queen en prise for four moves, and four players talked past it.** Game 1, 16...Qg5 and 17. Nf3: the knight attacked the queen; Black played 17...d5, 18...Ne7, 19...Ng6, 20...Nh4 and White answered exd5, e4, g3 and finally Nxh4 (engine 1000 for White each time, best Nxg5). The posts discussed the e-file, "Qxg2+ still fails to Kxg2" and an Nf4 fork (#720, #762, #805, #818), never the queen on g5.
- **Advice is mostly followed.** In 58 of the 90 moves that had a teammate's suggestion, the captain played it ("Played 18.exd5, following A01's suggestion", #739).
- **Team brains are written jointly.** A03 proposed the first brain on the channel (#45), A01 and A02 drafted and amended theirs (#51, #58).
- **Better play, at more than twice the price.** ACPL 98 over both games (default arm 167), the cleanest game in the series (game 2, ACPL 43 and 60), at 0.245 USD (2.3 times a solo run). Black missed two mates in game 1 (P110).

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidates (resignation as an exit, "no submissions") are its city framing (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P116 | Teams cost 2.3 times a solo run and play better (ACPL 98 vs 167), but one run; the four-move hanging queen shows two heads do not see more than one. | see the lessons log |
| P110 | Two missed mates by team B in game 1. | open |
| P120 | Two BRAIN_TOO_LONG refusals (seen again). | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

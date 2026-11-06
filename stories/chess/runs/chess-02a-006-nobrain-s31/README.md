# chess-02a-006-nobrain-s31

`swt run --story chess-nobrain-p80 --provider anthropic --model haiku --seed 31`, `-nobrain` arm (no strategy brain); two games with alternating colours, cap 80 half-moves. Run on 2026-11-06 as one of six comparison runs (see the [runs index](../README.md)). Scores: {"A01": 0, "A02": 2}. **Cost 0.055 USD**, 125 requests; the reporter draft about 0.003 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Result.** **A02 won both games by resignation**: game 1 at move 20 (19. Qc5?? Kh7?! 20. Nf3?? Nxc5, the queen hung for two moves), game 2 at move 24 when 24. Qxa5 won A01's queen.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | A01 resigned | 40 | A02 1 | 169 / 104 | 3 / 2 | 0 |
| 2 | A02 | 1-0 | A01 resigned | 47 | A01 1 | 138 / 182 | 2 / 3 | 0 |

## Digest highlights

- **Both sides missed the free queen.** 19. Qc5 hung the queen to Nxc5; Black played 19...Kh7 (engine 1000 to -37), White did not save it (20. Nf3) and Black took it then. The pattern of P113.
- **Reporter loophole candidate, real.** The draft pointed out that in the default arm a refused move shows the full legal list, so an illegal guess fetches what the `-moves` arm gives for free. Here it is moot (no brain, one refusal each), but in principle a seat could write a nonsense move every turn to get the list. Fixed after this run: the refusal now names only the legal moves of the piece written (LH, see the lessons log).

## Loopholes

None by the residents. No seat moved out of turn, no move bypassed chess.js, and the engine numbers and refusals stayed with the human. The reporter's candidate about the refusal list is real (see Problems).

## Problems

| # | Problem | Solution |
|---|---|---|
| LH13 | Illegal moves fetched the full legal list in the default arm. | fixed after this run: `refusalHint` names only the moves of the piece written |
| P115 | No brain effect visible (ACPL 144 for `-nobrain` vs 167 default). | see the lessons log |
| P89 | The reporter draft is still city-shaped (levels, submissions, "exit" for a resignation). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md`; the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

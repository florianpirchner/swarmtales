# chess-02a-044-moves-threats-g4-s41-opus

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model claude-opus-5-5 --seed 41` (both seats claude-opus-5-5), `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 6.869 USD**, 446 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | A02 1 | 77 / 68 | 2 / 1 | 0 |
| 2 | A02 | 1-0 | move cap, on material | 80 | A01 1 | 135 / 159 | 5 / 8 | 0 |
| 3 | A01 | 1/2-1/2 | move cap, on material | 80 | A01 1 | 46 / 29 | 0 / 0 | 0 |
| 4 | A02 | 0-1 | move cap, on material | 80 | 0 | 74 / 57 | 1 / 1 | 0 |

## Digest highlights

- **Both Opus seats missed a hanging queen with the loose-piece list on the board.** Game 2: 29. Qb4?? (engine 781 to -845), and Black answered 29...Qf6?? instead of Qxb4 (loss 1539); the mutual blindness of P113 is not a Haiku-only problem.
- With the lists Opus was not better than without (ACPL 81 against 55 in run 043, one seed each); game 2 alone had 13 blunders.
- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: A01 lost on material at the cap; its worst move 29... Qf6 (engine 845 to -694, Qxb4 was best, not punished (Bd5; Rbd1 was best)).
- Game 3: drawn (move cap) after 80 half-moves.
- Game 4: A02 lost on material at the cap; its worst move 36. g4 (engine 456 to -534, Ng4 was best, punished by Nf4+).

## Loopholes

None by the residents beyond LH16 (draws accepted at the cap). The reporter's candidate is city-shaped (P89).

## Problems

| # | Problem | Solution |
|---|---|---|
| P327 | Cost 6.87 USD against `--budget 4`: the flag was ignored for core stories. | fixed in code |
| P328 | Three of four games at the cap. | open |
| P120 | 1 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.stockfish10.md` and `run/analysis.stockfish10.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).

> **Engine note (2026-11-14).** The engine numbers in this README are from Stockfish 10 at depth 14 and are kept as measured ([ANALYSIS.stockfish10.md](run/ANALYSIS.stockfish10.md), `run/analysis.stockfish10.json`). The reference engine is now Garbochess-JS at depth 10: the same games scored again are in [ANALYSIS.md](run/ANALYSIS.md) and `run/analysis.json`, and [REANALYSIS.md](../REANALYSIS.md) compares the two. Numbers of the two engines are not comparable.

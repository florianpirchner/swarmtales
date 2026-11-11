# chess-02a-021-default-g4-s47-stopped

`swt run --story chess-g4-p80 --provider anthropic --model haiku --seed 47`, default arm (brain on, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: none (stopped before the match ended). **Cost 0.095 USD**, 197 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Stopped run.** The container was reclaimed on 2026-11-07 during game 3 or 4 (Flo had stopped the series); the run has no `run_end`, no `usage.json` (cost summed from the usage events) and no signed head: `swt log verify` reports "not covered by a signed head", while every line hash links (the check fails only after the last line). The unfinished game is analysed but not counted in the comparison. Seed 47 was played again in full in runs 025-028.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 54 | A01 2 | 114 / 84 | 1 / 1 | 0 |
| 2 | A02 | 1-0 | resigned (A01) | 37 | 0 | 66 / 115 | 0 / 2 | 0 |
| 3 | A01 | unfinished | the run was stopped | 36 | | 110 / 100 | 2 / 2 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 16. Qc1 (engine 408 to -737, Qxa4 was best, not punished (Bxd4; Rxe1+ was best)).
- Game 2: A01 resigned; its worst move 18... Bf6 (engine -479 to -1000, Rc8 was best, punished by Bxa8).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 1 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json` (reporter only), `run/agents/` (transcripts).

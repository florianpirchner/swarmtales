# chess-02a-023-moves-threats-g4-s47-stopped

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model haiku --seed 47`, `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: none (stopped before the match ended). **Cost 0.099 USD**, 189 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Stopped run.** The container was reclaimed on 2026-11-07 during game 3 or 4 (Flo had stopped the series); the run has no `run_end`, no `usage.json` (cost summed from the usage events) and no signed head: `swt log verify` reports "not covered by a signed head", while every line hash links (the check fails only after the last line). The unfinished game is analysed but not counted in the comparison. Seed 47 was played again in full in runs 025-028.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 35 | A02 1 | 58 / 127 | 0 / 2 | 0 |
| 2 | A02 | 1-0 | resigned (A01) | 47 | A01 2 | 118 / 162 | 3 / 4 | 3 |
| 3 | A01 | unfinished | the run was stopped | 41 | | 71 / 100 | 2 / 2 | 0 |

## Digest highlights

- Game 1: A02 resigned; its worst move 17... Qxd4+ (engine -444 to -1000, Qc7 was best, punished by cxd4).
- Game 2: A01 resigned; its worst move 20... Qc3 (engine 401 to -996, Re1+ was best, not punished (Rf1; Qxf7+ was best)).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json` (reporter only), `run/agents/` (transcripts).

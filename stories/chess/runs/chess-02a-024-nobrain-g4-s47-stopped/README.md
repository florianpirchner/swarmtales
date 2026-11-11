# chess-02a-024-nobrain-g4-s47-stopped

`swt run --story chess-nobrain-g4-p80 --provider anthropic --model haiku --seed 47`, `-nobrain` (no brain, no list); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-06/07. Final points: none (stopped before the match ended). **Cost 0.092 USD**, 203 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

**Stopped run.** The container was reclaimed on 2026-11-07 during game 3 or 4 (Flo had stopped the series); the run has no `run_end`, no `usage.json` (cost summed from the usage events) and no signed head: `swt log verify` reports "not covered by a signed head", while every line hash links (the check fails only after the last line). The unfinished game is analysed but not counted in the comparison. Seed 47 was played again in full in runs 025-028.

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 42 | A02 1 | 117 / 66 | 2 / 0 | 0 |
| 2 | A02 | 1-0 | checkmate | 51 | A01 4 | 257 / 256 | 7 / 5 | 2 |
| 3 | A01 | unfinished | the run was stopped | 49 | | 65 / 62 | 0 / 0 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 21. Qd2 (engine -101 to -1000, Qc7 was best, punished by Qxd2).
- Game 2: A01 mated; its worst move 22... Be4 (engine 901 to -997, Qa1+ was best, not punished (Nxe4; Qxf7+ was best)).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json` (reporter only), `run/agents/` (transcripts).

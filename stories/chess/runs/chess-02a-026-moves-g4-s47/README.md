# chess-02a-026-moves-g4-s47

`swt run --story chess-moves-g4-p80 --provider anthropic --model haiku --seed 47`, `-moves` (brain on, legal moves listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 1, A02 3. **Cost 0.272 USD**, 373 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1-0 | resigned (A02) | 63 | 0 | 105 / 129 | 4 / 6 | 1 |
| 2 | A02 | 1-0 | resigned (A01) | 63 | 0 | 76 / 113 | 2 / 1 | 0 |
| 3 | A01 | 0-1 | checkmate | 60 | 0 | 188 / 152 | 4 / 5 | 1 |
| 4 | A02 | 1-0 | resigned (A01) | 71 | A02 1 | 144 / 172 | 5 / 6 | 0 |

## Digest highlights

- Game 1: A02 resigned; its worst move 17... Rd8 (engine 998 to 8, Nh3+ was best, not punished (Bf4; Kf1 was best)).
- Game 2: A01 resigned; its worst move 23... Qg3+ (engine 960 to -776, Qc1+ was best, punished by fxg3).
- Game 3: A01 mated; its worst move 28. Rd2 (engine 1000 to -1000, Qa4 was best, punished by Qe1+).
- Game 4: A01 resigned; its worst move 16... Qxe3 (engine 819 to -791, dxe3 was best, punished by fxe3).

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
